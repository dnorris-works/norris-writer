/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { join } from '../../../../base/common/path.js';
import { IEnvironmentMainService } from '../../../../platform/environment/electron-main/environmentMainService.js';
import { ICodexDatabaseService } from '../common/codexDatabaseService.js';
import {
	CodexDatabaseChangeKind,
	ICodexDatabaseChangeEvent,
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
import { CodexDatabase } from '../node/codexDatabase.js';

export const CODEX_DATABASE_FILENAME = 'codex.db';

export class CodexDatabaseMainService extends Disposable implements ICodexDatabaseService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChange = this._register(new Emitter<ICodexDatabaseChangeEvent>());
	readonly onDidChange = this._onDidChange.event;

	private _database: CodexDatabase | undefined;
	private _databasePromise: Promise<CodexDatabase> | undefined;

	constructor(
		@IEnvironmentMainService private readonly environmentMainService: IEnvironmentMainService,
	) {
		super();
	}

	override dispose(): void {
		if (this._database) {
			void this._database.dispose();
			this._database = undefined;
		}
		this._databasePromise = undefined;
		super.dispose();
	}

	private _getDatabase(): Promise<CodexDatabase> {
		if (!this._databasePromise) {
			const path = join(this.environmentMainService.userDataPath, CODEX_DATABASE_FILENAME);
			this._databasePromise = CodexDatabase.open(path).then(db => {
				this._database = db;
				return db;
			});
		}
		return this._databasePromise;
	}

	private _fireChange(kind: CodexDatabaseChangeKind): void {
		this._onDidChange.fire({ kind });
	}

	getDatabaseInfo(): Promise<ICodexDatabaseInfo> {
		return this._getDatabase().then(db => db.getDatabaseInfo());
	}

	listPenNames(): Promise<readonly IPenName[]> {
		return this._getDatabase().then(db => db.listPenNames());
	}

	getPenName(id: string): Promise<IPenName | undefined> {
		return this._getDatabase().then(db => db.getPenName(id));
	}

	async createPenName(input: ICreatePenNameInput): Promise<IPenName> {
		const db = await this._getDatabase();
		const result = await db.createPenName(input);
		this._fireChange('pen_names');
		return result;
	}

	async updatePenName(id: string, input: IUpdatePenNameInput): Promise<IPenName | undefined> {
		const db = await this._getDatabase();
		const result = await db.updatePenName(id, input);
		if (result) {
			this._fireChange('pen_names');
		}
		return result;
	}

	async deletePenName(id: string): Promise<boolean> {
		const db = await this._getDatabase();
		const deleted = await db.deletePenName(id);
		if (deleted) {
			this._fireChange('pen_names');
		}
		return deleted;
	}

	listStories(penNameId?: string): Promise<readonly IStory[]> {
		return this._getDatabase().then(db => db.listStories(penNameId));
	}

	getStory(id: string): Promise<IStory | undefined> {
		return this._getDatabase().then(db => db.getStory(id));
	}

	async createStory(input: ICreateStoryInput): Promise<IStory> {
		const db = await this._getDatabase();
		const result = await db.createStory(input);
		this._fireChange('stories');
		return result;
	}

	async updateStory(id: string, input: IUpdateStoryInput): Promise<IStory | undefined> {
		const db = await this._getDatabase();
		const result = await db.updateStory(id, input);
		if (result) {
			this._fireChange('stories');
		}
		return result;
	}

	async deleteStory(id: string): Promise<boolean> {
		const db = await this._getDatabase();
		const deleted = await db.deleteStory(id);
		if (deleted) {
			this._fireChange('stories');
			this._fireChange('entries');
			this._fireChange('relationships');
		}
		return deleted;
	}

	listEntries(storyId: string): Promise<readonly ICodexEntry[]> {
		return this._getDatabase().then(db => db.listEntries(storyId));
	}

	getEntry(id: string): Promise<ICodexEntry | undefined> {
		return this._getDatabase().then(db => db.getEntry(id));
	}

	async createEntry(input: ICreateCodexEntryInput): Promise<ICodexEntry> {
		const db = await this._getDatabase();
		const result = await db.createEntry(input);
		this._fireChange('entries');
		return result;
	}

	async updateEntry(id: string, input: IUpdateCodexEntryInput): Promise<ICodexEntry | undefined> {
		const db = await this._getDatabase();
		const result = await db.updateEntry(id, input);
		if (result) {
			this._fireChange('entries');
		}
		return result;
	}

	async deleteEntry(id: string): Promise<boolean> {
		const db = await this._getDatabase();
		const deleted = await db.deleteEntry(id);
		if (deleted) {
			this._fireChange('entries');
			this._fireChange('relationships');
		}
		return deleted;
	}

	async setEntryAliases(entryId: string, aliases: readonly string[]): Promise<ICodexEntry | undefined> {
		const db = await this._getDatabase();
		const result = await db.setEntryAliases(entryId, aliases);
		if (result) {
			this._fireChange('entries');
		}
		return result;
	}

	listRelationships(storyId: string, entryId?: string): Promise<readonly ICodexRelationship[]> {
		return this._getDatabase().then(db => db.listRelationships(storyId, entryId));
	}

	async createRelationship(input: ICreateCodexRelationshipInput): Promise<ICodexRelationship> {
		const db = await this._getDatabase();
		const result = await db.createRelationship(input);
		this._fireChange('relationships');
		return result;
	}

	async deleteRelationship(id: string): Promise<boolean> {
		const db = await this._getDatabase();
		const deleted = await db.deleteRelationship(id);
		if (deleted) {
			this._fireChange('relationships');
		}
		return deleted;
	}
}
