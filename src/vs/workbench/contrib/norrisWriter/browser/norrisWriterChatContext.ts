/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isLocation } from '../../../../editor/common/languages.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { URI } from '../../../../base/common/uri.js';
import { basename, extname } from '../../../../base/common/resources.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import {
	IChatRequestVariableEntry,
	isChatRequestFileEntry,
	isImplicitVariableEntry,
	isPasteVariableEntry,
	isPromptFileVariableEntry,
	isPromptTextVariableEntry,
	isStringVariableEntry,
	isWorkspaceVariableEntry,
	OmittedState,
} from '../../chat/common/attachments/chatVariableEntries.js';

const MAX_FILE_BYTES = 100_000;
const MAX_TOTAL_CONTEXT_BYTES = 400_000;
const MAX_DIRECTORY_FILES = 30;

const TEXT_FILE_EXTENSIONS = new Set([
	'.md', '.markdown', '.txt', '.mdown', '.mkd',
]);

export class NorrisWriterChatContextResolver {

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IModelService private readonly modelService: IModelService,
		@ITextModelService private readonly textModelService: ITextModelService,
		@ILogService private readonly logService: ILogService,
	) { }

	async formatAttachedContext(variables: readonly IChatRequestVariableEntry[], token: CancellationToken): Promise<string> {
		const blocks: string[] = [];
		let totalBytes = 0;

		for (const variable of variables) {
			if (token.isCancellationRequested) {
				break;
			}
			if (variable.omittedState === OmittedState.Full) {
				continue;
			}
			if (isImplicitVariableEntry(variable) && variable.enabled === false) {
				continue;
			}

			const blocksForVariable = await this._formatVariable(variable, token);
			for (const block of blocksForVariable) {
				if (totalBytes + block.length > MAX_TOTAL_CONTEXT_BYTES) {
					this.logService.trace('[NorrisWriter] Skipping remaining attachments: context size limit reached.');
					return blocks.join('\n\n');
				}
				blocks.push(block);
				totalBytes += block.length;
			}
		}

		return blocks.join('\n\n');
	}

	private async _formatVariable(variable: IChatRequestVariableEntry, token: CancellationToken): Promise<string[]> {
		if (isPasteVariableEntry(variable)) {
			return [this._wrapContextBlock(variable.name, variable.code)];
		}
		if (isPromptTextVariableEntry(variable)) {
			return variable.value ? [this._wrapContextBlock(variable.name, variable.value)] : [];
		}
		if (isStringVariableEntry(variable) && typeof variable.value === 'string') {
			return [this._wrapContextBlock(variable.name, variable.value)];
		}
		if (isWorkspaceVariableEntry(variable)) {
			return [this._wrapContextBlock(variable.name, variable.value)];
		}
		if (isPromptFileVariableEntry(variable) && variable.value instanceof URI) {
			const text = await this._readUriText(variable.value, undefined, token);
			return text ? [this._wrapContextBlock(variable.name, text, variable.value)] : [];
		}
		if (variable.kind === 'directory' && variable.value instanceof URI) {
			return this._readDirectoryContext(variable.value, variable.name, token);
		}
		if (isChatRequestFileEntry(variable) || isImplicitVariableEntry(variable)) {
			return this._formatFileLikeVariable(variable, token);
		}
		return [];
	}

	private async _formatFileLikeVariable(variable: IChatRequestVariableEntry, token: CancellationToken): Promise<string[]> {
		const value = variable.value;
		if (isLocation(value)) {
			const text = await this._readUriText(value.uri, value.range, token);
			return text ? [this._wrapContextBlock(variable.name, text, value.uri, value.range)] : [];
		}
		if (value instanceof URI) {
			const text = await this._readUriText(value, undefined, token);
			return text ? [this._wrapContextBlock(variable.name, text, value)] : [];
		}
		return [];
	}

	private async _readDirectoryContext(directory: URI, label: string, token: CancellationToken): Promise<string[]> {
		const files = await this._collectTextFiles(directory, token);
		if (!files.length) {
			return [];
		}
		const blocks: string[] = [`## Folder: ${label}`];
		for (const file of files) {
			if (token.isCancellationRequested) {
				break;
			}
			const text = await this._readUriText(file, undefined, token);
			if (text) {
				blocks.push(this._wrapContextBlock(basename(file), text, file));
			}
		}
		return blocks.length > 1 ? [blocks.join('\n\n')] : [];
	}

	private async _collectTextFiles(directory: URI, token: CancellationToken): Promise<URI[]> {
		const result: URI[] = [];
		const queue = [directory];

		while (queue.length && result.length < MAX_DIRECTORY_FILES) {
			if (token.isCancellationRequested) {
				break;
			}
			const current = queue.shift()!;
			let stat;
			try {
				stat = await this.fileService.resolve(current);
			} catch {
				continue;
			}
			if (!stat.children) {
				continue;
			}
			for (const child of stat.children) {
				if (token.isCancellationRequested) {
					break;
				}
				if (child.isDirectory) {
					queue.push(child.resource);
				} else if (this._isTextFile(child.resource)) {
					result.push(child.resource);
					if (result.length >= MAX_DIRECTORY_FILES) {
						break;
					}
				}
			}
		}

		return result.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
	}

	private _isTextFile(uri: URI): boolean {
		const ext = extname(uri).toLowerCase();
		return TEXT_FILE_EXTENSIONS.has(ext);
	}

	private async _readUriText(uri: URI, range: IRange | undefined, token: CancellationToken): Promise<string | undefined> {
		const fromModel = this._readFromOpenModel(uri, range);
		if (fromModel !== undefined) {
			return fromModel;
		}

		try {
			const ref = await this.textModelService.createModelReference(uri);
			try {
				if (token.isCancellationRequested) {
					return undefined;
				}
				const model = ref.object.textEditorModel;
				const text = range ? model.getValueInRange(range) : model.getValue();
				return this._truncateText(text);
			} finally {
				ref.dispose();
			}
		} catch {
			try {
				const content = await this.fileService.readFile(uri);
				if (token.isCancellationRequested) {
					return undefined;
				}
				return this._truncateText(content.value.toString());
			} catch (err) {
				this.logService.trace(`[NorrisWriter] Could not read attachment ${uri.toString()}`, err);
				return undefined;
			}
		}
	}

	private _readFromOpenModel(uri: URI, range: IRange | undefined): string | undefined {
		const model = this.modelService.getModel(uri);
		if (!model) {
			return undefined;
		}
		const text = range ? model.getValueInRange(range) : model.getValue();
		return this._truncateText(text);
	}

	private _truncateText(text: string): string | undefined {
		const bytes = new TextEncoder().encode(text);
		if (bytes.byteLength <= MAX_FILE_BYTES) {
			return text;
		}
		const truncated = new TextDecoder().decode(bytes.slice(0, MAX_FILE_BYTES));
		return truncated + '\n\n[... truncated for length ...]';
	}

	private _wrapContextBlock(title: string, body: string, uri?: URI, range?: IRange): string {
		const header = uri
			? range
				? `## ${title} (${uri.fsPath}, lines ${range.startLineNumber}-${range.endLineNumber})`
				: `## ${title} (${uri.fsPath})`
			: `## ${title}`;
		return `${header}\n\n${body}`;
	}
}

export function composeUserMessageWithContext(message: string, context: string): string {
	const trimmedMessage = message.trim();
	if (!context.trim()) {
		return trimmedMessage;
	}
	if (!trimmedMessage) {
		return `Use the following reference material:\n\n${context}`;
	}
	return `${trimmedMessage}\n\n---\n\nReference material:\n\n${context}`;
}
