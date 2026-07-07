/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { basename, extname, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { parseFrontMatter } from '../../../../base/common/yaml.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import {
	NORRIS_CODEX_FOLDER_DEFAULT,
	NorrisWriterCodexAiContext,
	NorrisWriterCodexConfiguration,
	NorrisWriterCodexEntryType,
} from '../common/norrisWriterCodexConstants.js';

const MAX_ENTRY_BYTES = 50_000;
const MAX_TOTAL_CODEX_BYTES = 300_000;
const MAX_DETECTION_TEXT = 80_000;

export interface INorrisWriterCodexEntry {
	readonly uri: URI;
	readonly title: string;
	readonly type: NorrisWriterCodexEntryType;
	readonly aliases: readonly string[];
	readonly aiContext: NorrisWriterCodexAiContext;
	readonly enabled: boolean;
	readonly body: string;
}

export interface INorrisWriterCodexContextOptions {
	readonly message: string;
	readonly activeEditorText?: string;
}

export interface INorrisWriterCodexService {
	readonly _serviceBrand: undefined;
	readonly onDidChange: Event<void>;
	getEntries(): Promise<readonly INorrisWriterCodexEntry[]>;
	resolveContext(options: INorrisWriterCodexContextOptions, token: CancellationToken): Promise<string>;
	getCodexFolder(): URI | undefined;
	invalidate(): void;
}

export const INorrisWriterCodexService = createDecorator<INorrisWriterCodexService>('norrisWriterCodexService');

class NorrisWriterCodexService extends Disposable implements INorrisWriterCodexService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChange = this._register(new Emitter<void>());
	readonly onDidChange = this._onDidChange.event;

	private _entriesPromise: Promise<readonly INorrisWriterCodexEntry[]> | undefined;
	private _codexRoot: URI | undefined;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILogService private readonly logService: ILogService,
	) {
		super();

		this._register(this.workspaceContextService.onDidChangeWorkspaceFolders(() => this.invalidate()));
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(NorrisWriterCodexConfiguration.Enabled)
				|| e.affectsConfiguration(NorrisWriterCodexConfiguration.Folder)) {
				this.invalidate();
			}
		}));
		this._register(this.fileService.onDidFilesChange(e => {
			if (!this._codexRoot) {
				return;
			}
			for (const change of [...e.rawAdded, ...e.rawUpdated, ...e.rawDeleted]) {
				if (change.toString().startsWith(this._codexRoot.toString())) {
					this.invalidate();
					break;
				}
			}
		}));
	}

	invalidate(): void {
		this._entriesPromise = undefined;
		this._codexRoot = undefined;
		this._onDidChange.fire();
	}

	getCodexFolder(): URI | undefined {
		const folder = this.workspaceContextService.getWorkspace().folders[0];
		if (!folder) {
			return undefined;
		}
		const codexFolderName = this.configurationService.getValue<string>(NorrisWriterCodexConfiguration.Folder) || NORRIS_CODEX_FOLDER_DEFAULT;
		return joinPath(folder.uri, codexFolderName);
	}

	async getEntries(): Promise<readonly INorrisWriterCodexEntry[]> {
		if (!this._entriesPromise) {
			this._entriesPromise = this._loadEntries();
		}
		return this._entriesPromise;
	}

	async resolveContext(options: INorrisWriterCodexContextOptions, token: CancellationToken): Promise<string> {
		if (!this.configurationService.getValue<boolean>(NorrisWriterCodexConfiguration.Enabled)) {
			return '';
		}

		const entries = await this.getEntries();
		if (!entries.length) {
			return '';
		}

		const detectionText = this._buildDetectionText(options);
		const selected = entries.filter(entry => this._shouldInclude(entry, detectionText));
		if (!selected.length) {
			return '';
		}

		const blocks: string[] = [];
		let totalBytes = 0;
		for (const entry of selected) {
			if (token.isCancellationRequested) {
				break;
			}
			const block = this._formatEntry(entry);
			if (totalBytes + block.length > MAX_TOTAL_CODEX_BYTES) {
				this.logService.trace('[NorrisWriterCodex] Context size limit reached.');
				break;
			}
			blocks.push(block);
			totalBytes += block.length;
		}

		return blocks.join('\n\n');
	}

	private async _loadEntries(): Promise<readonly INorrisWriterCodexEntry[]> {
		const codexRoot = this.getCodexFolder();
		if (!codexRoot) {
			return [];
		}
		this._codexRoot = codexRoot;

		if (!(await this.fileService.exists(codexRoot))) {
			return [];
		}

		const entries: INorrisWriterCodexEntry[] = [];
		const queue = [codexRoot];
		while (queue.length) {
			const folder = queue.shift()!;
			let stat;
			try {
				stat = await this.fileService.resolve(folder);
			} catch {
				continue;
			}
			if (!stat.children) {
				continue;
			}
			for (const child of stat.children) {
				if (child.isDirectory) {
					queue.push(child.resource);
					continue;
				}
				if (!this._isCodexFile(child.resource)) {
					continue;
				}
				const entry = await this._parseEntry(child.resource);
				if (entry) {
					entries.push(entry);
				}
			}
		}

		return entries.sort((a, b) => a.title.localeCompare(b.title));
	}

	private _isCodexFile(uri: URI): boolean {
		const name = basename(uri);
		if (name.startsWith('_') || name.startsWith('.')) {
			return false;
		}
		const ext = extname(uri).toLowerCase();
		return ext === '.md' || ext === '.codex.md';
	}

	private async _parseEntry(uri: URI): Promise<INorrisWriterCodexEntry | undefined> {
		try {
			const content = await this.fileService.readFile(uri);
			const parsed = parseFrontMatter(content.value.toString());
			const title = parsed?.getStringValue('title')?.trim()
				|| basename(uri).replace(/\.codex\.md$/i, '').replace(/\.md$/i, '').replace(/[-_]/g, ' ');
			const type = this._parseEntryType(parsed?.getStringValue('type'));
			const aliases = parsed?.getStringArrayValue('aliases') ?? [];
			const aiContext = this._parseAiContext(parsed?.getStringValue('aiContext'));
			const enabled = parsed?.getBooleanValue('enabled') ?? true;
			const body = (parsed?.body ?? content.value.toString()).trim();

			return {
				uri,
				title,
				type,
				aliases,
				aiContext,
				enabled,
				body: this._truncate(body),
			};
		} catch (err) {
			this.logService.trace(`[NorrisWriterCodex] Failed to parse ${uri.toString()}`, err);
			return undefined;
		}
	}

	private _parseEntryType(value: string | undefined): NorrisWriterCodexEntryType {
		switch (value?.trim().toLowerCase()) {
			case NorrisWriterCodexEntryType.Character: return NorrisWriterCodexEntryType.Character;
			case NorrisWriterCodexEntryType.Location: return NorrisWriterCodexEntryType.Location;
			case NorrisWriterCodexEntryType.Lore: return NorrisWriterCodexEntryType.Lore;
			case NorrisWriterCodexEntryType.Object: return NorrisWriterCodexEntryType.Object;
			default: return NorrisWriterCodexEntryType.Other;
		}
	}

	private _parseAiContext(value: string | undefined): NorrisWriterCodexAiContext {
		switch (value?.trim().toLowerCase()) {
			case NorrisWriterCodexAiContext.Always: return NorrisWriterCodexAiContext.Always;
			case NorrisWriterCodexAiContext.Never: return NorrisWriterCodexAiContext.Never;
			default: return NorrisWriterCodexAiContext.WhenDetected;
		}
	}

	private _buildDetectionText(options: INorrisWriterCodexContextOptions): string {
		const parts = [options.message];
		if (options.activeEditorText) {
			parts.push(options.activeEditorText.slice(0, MAX_DETECTION_TEXT));
		}
		return parts.join('\n');
	}

	private _shouldInclude(entry: INorrisWriterCodexEntry, detectionText: string): boolean {
		if (!entry.enabled || entry.aiContext === NorrisWriterCodexAiContext.Never) {
			return false;
		}
		if (entry.aiContext === NorrisWriterCodexAiContext.Always) {
			return true;
		}
		return this._isMentioned(entry, detectionText);
	}

	private _isMentioned(entry: INorrisWriterCodexEntry, text: string): boolean {
		const names = [entry.title, ...entry.aliases].map(name => name.trim()).filter(Boolean);
		for (const name of names) {
			const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i');
			if (pattern.test(text)) {
				return true;
			}
		}
		return false;
	}

	private _formatEntry(entry: INorrisWriterCodexEntry): string {
		const header = `### ${entry.title} (${entry.type})`;
		if (!entry.body) {
			return header;
		}
		return `${header}\n\n${entry.body}`;
	}

	private _truncate(text: string): string {
		const bytes = new TextEncoder().encode(text);
		if (bytes.byteLength <= MAX_ENTRY_BYTES) {
			return text;
		}
		return new TextDecoder().decode(bytes.slice(0, MAX_ENTRY_BYTES)) + '\n\n[... truncated ...]';
	}
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

registerSingleton(INorrisWriterCodexService, NorrisWriterCodexService, InstantiationType.Delayed);

export function formatCodexSystemSection(codexContext: string): string {
	if (!codexContext.trim()) {
		return '';
	}
	return localize(
		'norrisWriter.codex.systemSection',
		'## Project Codex\n\nThe following project codex entries are authoritative for continuity, world-building, and character facts. Prefer them over general knowledge.\n\n{0}',
		codexContext,
	);
}
