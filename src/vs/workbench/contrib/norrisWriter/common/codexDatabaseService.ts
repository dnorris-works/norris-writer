/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import {
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
} from './codexDatabaseTypes.js';

export const CODEX_DATABASE_CHANNEL = 'norrisWriterCodexDatabase';

export const ICodexDatabaseService = createDecorator<ICodexDatabaseService>('codexDatabaseService');

export interface ICodexDatabaseService {
	readonly _serviceBrand: undefined;

	readonly onDidChange: Event<ICodexDatabaseChangeEvent>;

	getDatabaseInfo(): Promise<ICodexDatabaseInfo>;

	listPenNames(): Promise<readonly IPenName[]>;
	getPenName(id: string): Promise<IPenName | undefined>;
	createPenName(input: ICreatePenNameInput): Promise<IPenName>;
	updatePenName(id: string, input: IUpdatePenNameInput): Promise<IPenName | undefined>;
	deletePenName(id: string): Promise<boolean>;

	listStories(penNameId?: string): Promise<readonly IStory[]>;
	getStory(id: string): Promise<IStory | undefined>;
	createStory(input: ICreateStoryInput): Promise<IStory>;
	updateStory(id: string, input: IUpdateStoryInput): Promise<IStory | undefined>;
	deleteStory(id: string): Promise<boolean>;

	listEntries(storyId: string): Promise<readonly ICodexEntry[]>;
	getEntry(id: string): Promise<ICodexEntry | undefined>;
	createEntry(input: ICreateCodexEntryInput): Promise<ICodexEntry>;
	updateEntry(id: string, input: IUpdateCodexEntryInput): Promise<ICodexEntry | undefined>;
	deleteEntry(id: string): Promise<boolean>;
	setEntryAliases(entryId: string, aliases: readonly string[]): Promise<ICodexEntry | undefined>;

	listRelationships(storyId: string, entryId?: string): Promise<readonly ICodexRelationship[]>;
	createRelationship(input: ICreateCodexRelationshipInput): Promise<ICodexRelationship>;
	deleteRelationship(id: string): Promise<boolean>;
}
