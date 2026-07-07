/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../../base/common/buffer.js';
import { joinPath } from '../../../../base/common/resources.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService, IQuickPickItem } from '../../../../platform/quickinput/common/quickInput.js';
import { CHAT_OPEN_ACTION_ID } from '../../chat/browser/actions/chatActions.js';
import {
	CODEX_CHARACTER_TEMPLATE,
	CODEX_ENTRY_TEMPLATE,
	CODEX_SERIES_BIBLE_TEMPLATE,
	slugifyCodexTitle,
} from '../common/norrisWriterCodexTemplates.js';
import {
	NORRIS_CODEX_FOLDER_DEFAULT,
	NORRIS_NEW_CODEX_ENTRY_COMMAND_ID,
	NORRIS_OPEN_CODEX_COMMAND_ID,
	NorrisWriterCodexEntryType,
} from '../common/norrisWriterCodexConstants.js';
import { INorrisWriterCodexService } from './norrisWriterCodexService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';

const NOVEL_GITIGNORE = [
	'.norris-writer/',
	'.DS_Store',
	'*.tmp',
	'exports/',
	'',
].join('\n');

const CHAPTER_TEMPLATE = `# Chapter 1

Start writing here.

`;

export const NORRIS_NEW_NOVEL_COMMAND_ID = 'norrisWriter.newNovel';
export const NORRIS_OPEN_CHAT_COMMAND_ID = 'norrisWriter.openChat';
export const NORRIS_WRITING_LAYOUT_COMMAND_ID = 'norrisWriter.writingLayout';
/** @deprecated Use `norrisWriter.configureTokenMix` instead */
/** @deprecated Use `norrisWriter.configureTokenMix` instead */
export const NORRIS_CONFIGURE_OPENROUTER_COMMAND_ID = 'norrisWriter.configureOpenRouter';

interface ICodexTypePickItem extends IQuickPickItem {
	readonly entryType: NorrisWriterCodexEntryType;
}

registerAction2(class NorrisNewNovelAction extends Action2 {
	constructor() {
		super({
			id: NORRIS_NEW_NOVEL_COMMAND_ID,
			title: localize2('norrisWriter.newNovel', 'New Novel Project...'),
			category: localize2('norrisWriter.category', 'Norris Writer'),
			f1: true,
			menu: [
				{ id: MenuId.MenubarFileMenu, group: '1_new', order: 1 },
				{ id: MenuId.NewFile, group: 'file', order: 0 },
			],
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const quickInputService = accessor.get(IQuickInputService);
		const fileDialogService = accessor.get(IFileDialogService);
		const fileService = accessor.get(IFileService);
		const commandService = accessor.get(ICommandService);

		const projectName = await quickInputService.input({
			title: localize('norrisWriter.newNovel.title', 'New Novel Project'),
			prompt: localize('norrisWriter.newNovel.prompt', 'Enter a name for your novel project'),
			value: 'My Novel',
			validateInput: async (value) => {
				if (!value.trim()) {
					return localize('norrisWriter.newNovel.nameRequired', 'Project name is required');
				}
				if (/[\\/:*?"<>|]/.test(value)) {
					return localize('norrisWriter.newNovel.invalidName', 'Project name contains invalid characters');
				}
				return undefined;
			},
		});
		if (!projectName) {
			return;
		}

		const parentFolders = await fileDialogService.showOpenDialog({
			title: localize('norrisWriter.newNovel.pickFolder', 'Choose where to create the project'),
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
		});
		if (!parentFolders?.length) {
			return;
		}

		const projectRoot = joinPath(parentFolders[0], projectName.trim());
		if (await fileService.exists(projectRoot)) {
			throw new Error(localize('norrisWriter.newNovel.exists', "A folder named '{0}' already exists.", projectName.trim()));
		}

		await fileService.createFolder(joinPath(projectRoot, 'manuscript'));
		await fileService.createFolder(joinPath(projectRoot, NORRIS_CODEX_FOLDER_DEFAULT, 'characters'));
		await fileService.createFolder(joinPath(projectRoot, NORRIS_CODEX_FOLDER_DEFAULT, 'locations'));
		await fileService.createFolder(joinPath(projectRoot, NORRIS_CODEX_FOLDER_DEFAULT, 'lore'));
		await fileService.createFolder(joinPath(projectRoot, 'notes'));
		await fileService.writeFile(joinPath(projectRoot, 'manuscript', 'chapter-01.md'), VSBuffer.fromString(CHAPTER_TEMPLATE));
		await fileService.writeFile(joinPath(projectRoot, NORRIS_CODEX_FOLDER_DEFAULT, 'lore', 'series-bible.codex.md'), VSBuffer.fromString(CODEX_SERIES_BIBLE_TEMPLATE));
		await fileService.writeFile(joinPath(projectRoot, NORRIS_CODEX_FOLDER_DEFAULT, 'characters', 'protagonist.codex.md'), VSBuffer.fromString(CODEX_CHARACTER_TEMPLATE('Protagonist')));
		await fileService.writeFile(joinPath(projectRoot, NORRIS_CODEX_FOLDER_DEFAULT, '_template.codex.md'), VSBuffer.fromString(CODEX_ENTRY_TEMPLATE));
		await fileService.writeFile(joinPath(projectRoot, 'notes', 'ideas.md'), VSBuffer.fromString('# Ideas\n\n'));
		await fileService.writeFile(joinPath(projectRoot, '.gitignore'), VSBuffer.fromString(NOVEL_GITIGNORE));
		await fileService.writeFile(joinPath(projectRoot, 'README.md'), VSBuffer.fromString(`# ${projectName.trim()}\n\nA Norris Writer manuscript project.\n`));

		await commandService.executeCommand('vscode.openFolder', projectRoot, { forceNewWindow: false });
		await commandService.executeCommand('git.init', true);
		await commandService.executeCommand('vscode.open', joinPath(projectRoot, 'manuscript', 'chapter-01.md'));
	}
});

registerAction2(class NorrisOpenChatAction extends Action2 {
	constructor() {
		super({
			id: NORRIS_OPEN_CHAT_COMMAND_ID,
			title: localize2('norrisWriter.openChat', 'Open Chat'),
			category: localize2('norrisWriter.category', 'Norris Writer'),
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		await commandService.executeCommand(CHAT_OPEN_ACTION_ID);
	}
});

registerAction2(class NorrisWritingLayoutAction extends Action2 {
	constructor() {
		super({
			id: NORRIS_WRITING_LAYOUT_COMMAND_ID,
			title: localize2('norrisWriter.writingLayout', 'Writing Layout'),
			category: localize2('norrisWriter.category', 'Norris Writer'),
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		await commandService.executeCommand('workbench.action.toggleZenMode');
	}
});

registerAction2(class NorrisOpenCodexAction extends Action2 {
	constructor() {
		super({
			id: NORRIS_OPEN_CODEX_COMMAND_ID,
			title: localize2('norrisWriter.openCodex', 'Open Codex'),
			category: localize2('norrisWriter.category', 'Norris Writer'),
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const codexService = accessor.get(INorrisWriterCodexService);
		const fileService = accessor.get(IFileService);
		const commandService = accessor.get(ICommandService);
		const codexFolder = codexService.getCodexFolder();
		if (!codexFolder) {
			throw new Error(localize('norrisWriter.codex.noWorkspace', 'Open a novel project folder first.'));
		}
		if (!(await fileService.exists(codexFolder))) {
			await fileService.createFolder(codexFolder);
		}
		await commandService.executeCommand('revealInExplorer', codexFolder);
	}
});

registerAction2(class NorrisNewCodexEntryAction extends Action2 {
	constructor() {
		super({
			id: NORRIS_NEW_CODEX_ENTRY_COMMAND_ID,
			title: localize2('norrisWriter.newCodexEntry', 'New Codex Entry...'),
			category: localize2('norrisWriter.category', 'Norris Writer'),
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const codexService = accessor.get(INorrisWriterCodexService);
		const fileService = accessor.get(IFileService);
		const quickInputService = accessor.get(IQuickInputService);
		const editorService = accessor.get(IEditorService);
		const codexFolder = codexService.getCodexFolder();
		if (!codexFolder) {
			throw new Error(localize('norrisWriter.codex.noWorkspace', 'Open a novel project folder first.'));
		}

		const typePick = await quickInputService.pick<ICodexTypePickItem>(
			[
				{ label: localize('norrisWriter.codex.type.character', 'Character'), entryType: NorrisWriterCodexEntryType.Character },
				{ label: localize('norrisWriter.codex.type.location', 'Location'), entryType: NorrisWriterCodexEntryType.Location },
				{ label: localize('norrisWriter.codex.type.lore', 'Lore / Bible'), entryType: NorrisWriterCodexEntryType.Lore },
				{ label: localize('norrisWriter.codex.type.object', 'Object'), entryType: NorrisWriterCodexEntryType.Object },
				{ label: localize('norrisWriter.codex.type.other', 'Other'), entryType: NorrisWriterCodexEntryType.Other },
			],
			{ title: localize('norrisWriter.codex.newEntryType', 'Codex entry type'), placeHolder: localize('norrisWriter.codex.newEntryTypePlaceholder', 'What kind of entry?') },
		);
		if (!typePick) {
			return;
		}

		const title = await quickInputService.input({
			title: localize('norrisWriter.codex.newEntryTitle', 'New Codex Entry'),
			prompt: localize('norrisWriter.codex.newEntryTitlePrompt', 'Entry title (used for AI detection)'),
			validateInput: async (value) => !value.trim()
				? localize('norrisWriter.codex.newEntryTitleRequired', 'Title is required')
				: undefined,
		});
		if (!title) {
			return;
		}

		const typeFolder = getCodexTypeFolder(typePick.entryType);
		const targetFolder = typeFolder ? joinPath(codexFolder, typeFolder) : codexFolder;
		await fileService.createFolder(targetFolder);

		const slug = slugifyCodexTitle(title);
		let fileUri = joinPath(targetFolder, `${slug}.codex.md`);
		let suffix = 2;
		while (await fileService.exists(fileUri)) {
			fileUri = joinPath(targetFolder, `${slug}-${suffix}.codex.md`);
			suffix++;
		}

		const body = typePick.entryType === NorrisWriterCodexEntryType.Character
			? CODEX_CHARACTER_TEMPLATE(title.trim())
			: CODEX_ENTRY_TEMPLATE.replace('Entry Title', title.trim()).replace('type: character', `type: ${typePick.entryType}`);

		await fileService.writeFile(fileUri, VSBuffer.fromString(body));
		codexService.invalidate();
		await editorService.openEditor({ resource: fileUri });
	}
});

function getCodexTypeFolder(type: NorrisWriterCodexEntryType): string {
	switch (type) {
		case NorrisWriterCodexEntryType.Character: return 'characters';
		case NorrisWriterCodexEntryType.Location: return 'locations';
		case NorrisWriterCodexEntryType.Lore: return 'lore';
		case NorrisWriterCodexEntryType.Object: return 'objects';
		default: return '';
	}
}
