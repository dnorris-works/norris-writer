/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { ISessionDatabaseMigration } from '../../../../platform/agentHost/node/sessionDatabase.js';

export const codexDatabaseMigrations: readonly ISessionDatabaseMigration[] = [
	{
		version: 1,
		sql: [
			`CREATE TABLE pen_names (
				id         TEXT PRIMARY KEY NOT NULL,
				name       TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			)`,
			`CREATE TABLE stories (
				id             TEXT PRIMARY KEY NOT NULL,
				pen_name_id    TEXT NOT NULL REFERENCES pen_names(id) ON DELETE RESTRICT,
				title          TEXT NOT NULL,
				workspace_path TEXT,
				created_at     INTEGER NOT NULL,
				updated_at     INTEGER NOT NULL
			)`,
			`CREATE TABLE codex_entries (
				id          TEXT PRIMARY KEY NOT NULL,
				story_id    TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
				entry_type  TEXT NOT NULL,
				title       TEXT NOT NULL,
				body        TEXT NOT NULL DEFAULT '',
				ai_context  TEXT NOT NULL DEFAULT 'when-detected',
				enabled     INTEGER NOT NULL DEFAULT 1,
				sort_order  INTEGER,
				created_at  INTEGER NOT NULL,
				updated_at  INTEGER NOT NULL
			)`,
			`CREATE TABLE codex_aliases (
				id       TEXT PRIMARY KEY NOT NULL,
				entry_id TEXT NOT NULL REFERENCES codex_entries(id) ON DELETE CASCADE,
				alias    TEXT NOT NULL
			)`,
			`CREATE TABLE codex_relationships (
				id                TEXT PRIMARY KEY NOT NULL,
				story_id          TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
				from_entry_id     TEXT NOT NULL REFERENCES codex_entries(id) ON DELETE CASCADE,
				to_entry_id       TEXT NOT NULL REFERENCES codex_entries(id) ON DELETE CASCADE,
				relationship_type TEXT NOT NULL,
				notes             TEXT,
				created_at        INTEGER NOT NULL
			)`,
			`CREATE INDEX idx_stories_pen_name ON stories(pen_name_id)`,
			`CREATE INDEX idx_codex_entries_story ON codex_entries(story_id)`,
			`CREATE INDEX idx_codex_aliases_entry ON codex_aliases(entry_id)`,
			`CREATE INDEX idx_codex_relationships_story ON codex_relationships(story_id)`,
			`CREATE INDEX idx_codex_relationships_from ON codex_relationships(from_entry_id)`,
			`CREATE INDEX idx_codex_relationships_to ON codex_relationships(to_entry_id)`,
		].join(';\n'),
	},
];
