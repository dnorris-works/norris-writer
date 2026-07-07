/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const NORRIS_CODEX_FOLDER_DEFAULT = 'codex';

export const NORRIS_OPEN_CODEX_COMMAND_ID = 'norrisWriter.openCodex';
export const NORRIS_NEW_CODEX_ENTRY_COMMAND_ID = 'norrisWriter.newCodexEntry';

export const enum NorrisWriterCodexConfiguration {
	Enabled = 'norrisWriter.codex.enabled',
	Folder = 'norrisWriter.codex.folder',
}

export const enum NorrisWriterCodexAiContext {
	Always = 'always',
	WhenDetected = 'when-detected',
	Never = 'never',
}

export const enum NorrisWriterCodexEntryType {
	Character = 'character',
	Location = 'location',
	Lore = 'lore',
	Object = 'object',
	Other = 'other',
}

export const CODEX_ENTRY_TYPES = [
	NorrisWriterCodexEntryType.Character,
	NorrisWriterCodexEntryType.Location,
	NorrisWriterCodexEntryType.Lore,
	NorrisWriterCodexEntryType.Object,
	NorrisWriterCodexEntryType.Other,
] as const;
