/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NorrisWriterCodexAiContext, NorrisWriterCodexEntryType } from './norrisWriterCodexConstants.js';

export interface ICodexDatabaseInfo {
	readonly path: string;
	readonly schemaVersion: number;
}

export interface IPenName {
	readonly id: string;
	readonly name: string;
	readonly createdAt: number;
	readonly updatedAt: number;
}

export interface IStory {
	readonly id: string;
	readonly penNameId: string;
	readonly title: string;
	readonly workspacePath: string | undefined;
	readonly createdAt: number;
	readonly updatedAt: number;
}

export interface ICodexEntry {
	readonly id: string;
	readonly storyId: string;
	readonly entryType: NorrisWriterCodexEntryType;
	readonly title: string;
	readonly body: string;
	readonly aiContext: NorrisWriterCodexAiContext;
	readonly enabled: boolean;
	readonly sortOrder: number | undefined;
	readonly aliases: readonly string[];
	readonly createdAt: number;
	readonly updatedAt: number;
}

export interface ICodexRelationship {
	readonly id: string;
	readonly storyId: string;
	readonly fromEntryId: string;
	readonly toEntryId: string;
	readonly relationshipType: string;
	readonly notes: string | undefined;
	readonly createdAt: number;
}

export interface ICreatePenNameInput {
	readonly name: string;
}

export interface IUpdatePenNameInput {
	readonly name?: string;
}

export interface ICreateStoryInput {
	readonly penNameId: string;
	readonly title: string;
	readonly workspacePath?: string;
}

export interface IUpdateStoryInput {
	readonly penNameId?: string;
	readonly title?: string;
	readonly workspacePath?: string | null;
}

export interface ICreateCodexEntryInput {
	readonly storyId: string;
	readonly entryType: NorrisWriterCodexEntryType;
	readonly title: string;
	readonly body?: string;
	readonly aiContext?: NorrisWriterCodexAiContext;
	readonly enabled?: boolean;
	readonly sortOrder?: number;
	readonly aliases?: readonly string[];
}

export interface IUpdateCodexEntryInput {
	readonly entryType?: NorrisWriterCodexEntryType;
	readonly title?: string;
	readonly body?: string;
	readonly aiContext?: NorrisWriterCodexAiContext;
	readonly enabled?: boolean;
	readonly sortOrder?: number | null;
}

export interface ICreateCodexRelationshipInput {
	readonly storyId: string;
	readonly fromEntryId: string;
	readonly toEntryId: string;
	readonly relationshipType: string;
	readonly notes?: string;
}

export type CodexDatabaseChangeKind = 'pen_names' | 'stories' | 'entries' | 'relationships';

export interface ICodexDatabaseChangeEvent {
	readonly kind: CodexDatabaseChangeKind;
}
