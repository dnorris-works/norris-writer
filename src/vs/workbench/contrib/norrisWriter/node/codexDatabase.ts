/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import { randomUUID } from 'crypto';
import type { Database, RunResult } from '@vscode/sqlite3';
import { dirname } from '../../../../base/common/path.js';
import { runMigrations, type ISessionDatabaseMigration } from '../../../../platform/agentHost/node/sessionDatabase.js';
import {
	CODEX_ENTRY_TYPES,
	NorrisWriterCodexAiContext,
	NorrisWriterCodexEntryType,
} from '../common/norrisWriterCodexConstants.js';
import {
	ICodexDatabaseInfo,
	ICodexEntry,
	ICodexRelationship,
	ICreateCodexEntryInput,
	ICreateCodexRelationshipInput,
	ICreatePenNameInput,
	ICreateStoryInput,
	IPenName,
	IStory,
	IUpdateCodexEntryInput,
	IUpdatePenNameInput,
	IUpdateStoryInput,
} from '../common/codexDatabaseTypes.js';
import { codexDatabaseMigrations } from './codexDatabaseMigrations.js';

function dbExec(db: Database, sql: string): Promise<void> {
	return new Promise((resolve, reject) => {
		db.exec(sql, err => err ? reject(err) : resolve());
	});
}

function dbRun(db: Database, sql: string, params: unknown[]): Promise<{ changes: number; lastID: number }> {
	return new Promise((resolve, reject) => {
		db.run(sql, params, function (this: RunResult, err: Error | null) {
			if (err) {
				return reject(err);
			}
			resolve({ changes: this.changes, lastID: this.lastID });
		});
	});
}

function dbGet(db: Database, sql: string, params: unknown[]): Promise<Record<string, unknown> | undefined> {
	return new Promise((resolve, reject) => {
		db.get(sql, params, (err: Error | null, row: Record<string, unknown> | undefined) => {
			if (err) {
				return reject(err);
			}
			resolve(row);
		});
	});
}

function dbAll(db: Database, sql: string, params: unknown[]): Promise<Record<string, unknown>[]> {
	return new Promise((resolve, reject) => {
		db.all(sql, params, (err: Error | null, rows: Record<string, unknown>[]) => {
			if (err) {
				return reject(err);
			}
			resolve(rows);
		});
	});
}

function dbClose(db: Database): Promise<void> {
	return new Promise((resolve, reject) => {
		db.close(err => err ? reject(err) : resolve());
	});
}

function dbOpen(path: string): Promise<Database> {
	return new Promise((resolve, reject) => {
		import('@vscode/sqlite3').then(sqlite3 => {
			const db = new sqlite3.default.Database(path, (err: Error | null) => {
				if (err) {
					return reject(err);
				}
				resolve(db);
			});
		}, reject);
	});
}

function now(): number {
	return Date.now();
}

function assertEntryType(value: string): NorrisWriterCodexEntryType {
	if ((CODEX_ENTRY_TYPES as readonly string[]).includes(value)) {
		return value as NorrisWriterCodexEntryType;
	}
	throw new Error(`Invalid codex entry type: ${value}`);
}

function assertAiContext(value: string): NorrisWriterCodexAiContext {
	switch (value) {
		case NorrisWriterCodexAiContext.Always:
		case NorrisWriterCodexAiContext.WhenDetected:
		case NorrisWriterCodexAiContext.Never:
			return value;
		default:
			throw new Error(`Invalid ai_context: ${value}`);
	}
}

function rowToPenName(row: Record<string, unknown>): IPenName {
	return {
		id: row.id as string,
		name: row.name as string,
		createdAt: row.created_at as number,
		updatedAt: row.updated_at as number,
	};
}

function rowToStory(row: Record<string, unknown>): IStory {
	return {
		id: row.id as string,
		penNameId: row.pen_name_id as string,
		title: row.title as string,
		workspacePath: (row.workspace_path as string | null) ?? undefined,
		createdAt: row.created_at as number,
		updatedAt: row.updated_at as number,
	};
}

function rowToRelationship(row: Record<string, unknown>): ICodexRelationship {
	return {
		id: row.id as string,
		storyId: row.story_id as string,
		fromEntryId: row.from_entry_id as string,
		toEntryId: row.to_entry_id as string,
		relationshipType: row.relationship_type as string,
		notes: (row.notes as string | null) ?? undefined,
		createdAt: row.created_at as number,
	};
}

export class CodexDatabase {

	private _dbPromise: Promise<Database> | undefined;
	private _closed = false;

	constructor(
		private readonly _path: string,
		private readonly _migrations: readonly ISessionDatabaseMigration[] = codexDatabaseMigrations,
	) { }

	get path(): string {
		return this._path;
	}

	static async open(path: string, migrations: readonly ISessionDatabaseMigration[] = codexDatabaseMigrations): Promise<CodexDatabase> {
		const inst = new CodexDatabase(path, migrations);
		await inst._ensureDb();
		return inst;
	}

	async dispose(): Promise<void> {
		this._closed = true;
		if (this._dbPromise) {
			const db = await this._dbPromise.catch(() => undefined);
			if (db) {
				await dbClose(db);
			}
			this._dbPromise = undefined;
		}
	}

	private _ensureDb(): Promise<Database> {
		if (this._closed) {
			return Promise.reject(new Error('CodexDatabase has been disposed'));
		}
		if (!this._dbPromise) {
			this._dbPromise = (async () => {
				await fs.promises.mkdir(dirname(this._path), { recursive: true });
				const db = await dbOpen(this._path);
				try {
					await dbExec(db, 'PRAGMA journal_mode = WAL');
					await dbExec(db, 'PRAGMA busy_timeout = 5000');
					await runMigrations(db, this._migrations);
				} catch (err) {
					await dbClose(db);
					this._dbPromise = undefined;
					throw err;
				}
				if (this._closed) {
					await dbClose(db);
					throw new Error('CodexDatabase has been disposed');
				}
				return db;
			})();
		}
		return this._dbPromise;
	}

	async getDatabaseInfo(): Promise<ICodexDatabaseInfo> {
		const db = await this._ensureDb();
		const row = await dbGet(db, 'PRAGMA user_version', []);
		return {
			path: this._path,
			schemaVersion: (row?.user_version as number | undefined) ?? 0,
		};
	}

	async listPenNames(): Promise<readonly IPenName[]> {
		const db = await this._ensureDb();
		const rows = await dbAll(db, 'SELECT * FROM pen_names ORDER BY name COLLATE NOCASE', []);
		return rows.map(rowToPenName);
	}

	async getPenName(id: string): Promise<IPenName | undefined> {
		const db = await this._ensureDb();
		const row = await dbGet(db, 'SELECT * FROM pen_names WHERE id = ?', [id]);
		return row ? rowToPenName(row) : undefined;
	}

	async createPenName(input: ICreatePenNameInput): Promise<IPenName> {
		const db = await this._ensureDb();
		const id = randomUUID();
		const timestamp = now();
		await dbRun(db, 'INSERT INTO pen_names (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [id, input.name, timestamp, timestamp]);
		return (await this.getPenName(id))!;
	}

	async updatePenName(id: string, input: IUpdatePenNameInput): Promise<IPenName | undefined> {
		const existing = await this.getPenName(id);
		if (!existing) {
			return undefined;
		}
		const db = await this._ensureDb();
		const name = input.name ?? existing.name;
		const timestamp = now();
		await dbRun(db, 'UPDATE pen_names SET name = ?, updated_at = ? WHERE id = ?', [name, timestamp, id]);
		return this.getPenName(id);
	}

	async deletePenName(id: string): Promise<boolean> {
		const db = await this._ensureDb();
		const result = await dbRun(db, 'DELETE FROM pen_names WHERE id = ?', [id]);
		return result.changes > 0;
	}

	async listStories(penNameId?: string): Promise<readonly IStory[]> {
		const db = await this._ensureDb();
		const rows = penNameId
			? await dbAll(db, 'SELECT * FROM stories WHERE pen_name_id = ? ORDER BY title COLLATE NOCASE', [penNameId])
			: await dbAll(db, 'SELECT * FROM stories ORDER BY title COLLATE NOCASE', []);
		return rows.map(rowToStory);
	}

	async getStory(id: string): Promise<IStory | undefined> {
		const db = await this._ensureDb();
		const row = await dbGet(db, 'SELECT * FROM stories WHERE id = ?', [id]);
		return row ? rowToStory(row) : undefined;
	}

	async createStory(input: ICreateStoryInput): Promise<IStory> {
		const db = await this._ensureDb();
		const id = randomUUID();
		const timestamp = now();
		await dbRun(db,
			'INSERT INTO stories (id, pen_name_id, title, workspace_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
			[id, input.penNameId, input.title, input.workspacePath ?? null, timestamp, timestamp]);
		return (await this.getStory(id))!;
	}

	async updateStory(id: string, input: IUpdateStoryInput): Promise<IStory | undefined> {
		const existing = await this.getStory(id);
		if (!existing) {
			return undefined;
		}
		const db = await this._ensureDb();
		const penNameId = input.penNameId ?? existing.penNameId;
		const title = input.title ?? existing.title;
		const workspacePath = input.workspacePath === null
			? null
			: (input.workspacePath ?? existing.workspacePath ?? null);
		const timestamp = now();
		await dbRun(db,
			'UPDATE stories SET pen_name_id = ?, title = ?, workspace_path = ?, updated_at = ? WHERE id = ?',
			[penNameId, title, workspacePath, timestamp, id]);
		return this.getStory(id);
	}

	async deleteStory(id: string): Promise<boolean> {
		const db = await this._ensureDb();
		const result = await dbRun(db, 'DELETE FROM stories WHERE id = ?', [id]);
		return result.changes > 0;
	}

	async listEntries(storyId: string): Promise<readonly ICodexEntry[]> {
		const db = await this._ensureDb();
		const rows = await dbAll(db,
			'SELECT * FROM codex_entries WHERE story_id = ? ORDER BY sort_order IS NULL, sort_order, title COLLATE NOCASE',
			[storyId]);
		return Promise.all(rows.map(row => this._rowToEntry(db, row)));
	}

	async getEntry(id: string): Promise<ICodexEntry | undefined> {
		const db = await this._ensureDb();
		const row = await dbGet(db, 'SELECT * FROM codex_entries WHERE id = ?', [id]);
		return row ? this._rowToEntry(db, row) : undefined;
	}

	async createEntry(input: ICreateCodexEntryInput): Promise<ICodexEntry> {
		const db = await this._ensureDb();
		const id = randomUUID();
		const timestamp = now();
		const entryType = input.entryType;
		const aiContext = input.aiContext ?? NorrisWriterCodexAiContext.WhenDetected;
		const enabled = input.enabled ?? true;
		await dbRun(db,
			'INSERT INTO codex_entries (id, story_id, entry_type, title, body, ai_context, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[id, input.storyId, entryType, input.title, input.body ?? '', aiContext, enabled ? 1 : 0, input.sortOrder ?? null, timestamp, timestamp]);
		if (input.aliases?.length) {
			await this._replaceAliases(db, id, input.aliases);
		}
		return (await this.getEntry(id))!;
	}

	async updateEntry(id: string, input: IUpdateCodexEntryInput): Promise<ICodexEntry | undefined> {
		const existing = await this.getEntry(id);
		if (!existing) {
			return undefined;
		}
		const db = await this._ensureDb();
		const entryType = input.entryType ?? existing.entryType;
		const title = input.title ?? existing.title;
		const body = input.body ?? existing.body;
		const aiContext = input.aiContext ?? existing.aiContext;
		const enabled = input.enabled ?? existing.enabled;
		const sortOrder = input.sortOrder === null ? null : (input.sortOrder ?? existing.sortOrder ?? null);
		const timestamp = now();
		await dbRun(db,
			'UPDATE codex_entries SET entry_type = ?, title = ?, body = ?, ai_context = ?, enabled = ?, sort_order = ?, updated_at = ? WHERE id = ?',
			[entryType, title, body, aiContext, enabled ? 1 : 0, sortOrder, timestamp, id]);
		return this.getEntry(id);
	}

	async deleteEntry(id: string): Promise<boolean> {
		const db = await this._ensureDb();
		const result = await dbRun(db, 'DELETE FROM codex_entries WHERE id = ?', [id]);
		return result.changes > 0;
	}

	async setEntryAliases(entryId: string, aliases: readonly string[]): Promise<ICodexEntry | undefined> {
		const existing = await this.getEntry(entryId);
		if (!existing) {
			return undefined;
		}
		const db = await this._ensureDb();
		await this._replaceAliases(db, entryId, aliases);
		return this.getEntry(entryId);
	}

	async listRelationships(storyId: string, entryId?: string): Promise<readonly ICodexRelationship[]> {
		const db = await this._ensureDb();
		const rows = entryId
			? await dbAll(db,
				'SELECT * FROM codex_relationships WHERE story_id = ? AND (from_entry_id = ? OR to_entry_id = ?) ORDER BY created_at',
				[storyId, entryId, entryId])
			: await dbAll(db,
				'SELECT * FROM codex_relationships WHERE story_id = ? ORDER BY created_at',
				[storyId]);
		return rows.map(rowToRelationship);
	}

	async createRelationship(input: ICreateCodexRelationshipInput): Promise<ICodexRelationship> {
		const db = await this._ensureDb();
		const fromEntry = await this.getEntry(input.fromEntryId);
		const toEntry = await this.getEntry(input.toEntryId);
		if (!fromEntry || !toEntry || fromEntry.storyId !== input.storyId || toEntry.storyId !== input.storyId) {
			throw new Error('Relationship entries must belong to the specified story');
		}
		const id = randomUUID();
		const timestamp = now();
		await dbRun(db,
			'INSERT INTO codex_relationships (id, story_id, from_entry_id, to_entry_id, relationship_type, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[id, input.storyId, input.fromEntryId, input.toEntryId, input.relationshipType, input.notes ?? null, timestamp]);
		return (await this.getRelationship(id))!;
	}

	async getRelationship(id: string): Promise<ICodexRelationship | undefined> {
		const db = await this._ensureDb();
		const row = await dbGet(db, 'SELECT * FROM codex_relationships WHERE id = ?', [id]);
		return row ? rowToRelationship(row) : undefined;
	}

	async deleteRelationship(id: string): Promise<boolean> {
		const db = await this._ensureDb();
		const result = await dbRun(db, 'DELETE FROM codex_relationships WHERE id = ?', [id]);
		return result.changes > 0;
	}

	private async _rowToEntry(db: Database, row: Record<string, unknown>): Promise<ICodexEntry> {
		const id = row.id as string;
		const aliasRows = await dbAll(db, 'SELECT alias FROM codex_aliases WHERE entry_id = ? ORDER BY alias COLLATE NOCASE', [id]);
		return {
			id,
			storyId: row.story_id as string,
			entryType: assertEntryType(row.entry_type as string),
			title: row.title as string,
			body: row.body as string,
			aiContext: assertAiContext(row.ai_context as string),
			enabled: (row.enabled as number) !== 0,
			sortOrder: (row.sort_order as number | null) ?? undefined,
			aliases: aliasRows.map(r => r.alias as string),
			createdAt: row.created_at as number,
			updatedAt: row.updated_at as number,
		};
	}

	private async _replaceAliases(db: Database, entryId: string, aliases: readonly string[]): Promise<void> {
		await dbRun(db, 'DELETE FROM codex_aliases WHERE entry_id = ?', [entryId]);
		for (const alias of aliases) {
			const trimmed = alias.trim();
			if (!trimmed) {
				continue;
			}
			await dbRun(db, 'INSERT INTO codex_aliases (id, entry_id, alias) VALUES (?, ?, ?)', [randomUUID(), entryId, trimmed]);
		}
	}
}
