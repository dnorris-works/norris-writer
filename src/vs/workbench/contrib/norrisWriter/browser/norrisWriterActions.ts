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
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { CHAT_OPEN_ACTION_ID } from '../../chat/browser/actions/chatActions.js';
import { MANAGE_CHAT_COMMAND_ID } from '../../chat/common/constants.js';
import { ILanguageModelsService } from '../../chat/common/languageModels.js';

const OPENROUTER_VENDOR = 'openrouter';
const OPENROUTER_GROUP = 'OpenRouter';

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
export const NORRIS_CONFIGURE_OPENROUTER_COMMAND_ID = 'norrisWriter.configureOpenRouter';

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
		await fileService.createFolder(joinPath(projectRoot, 'notes'));
		await fileService.createFolder(joinPath(projectRoot, 'characters'));
		await fileService.writeFile(joinPath(projectRoot, 'manuscript', 'chapter-01.md'), VSBuffer.fromString(CHAPTER_TEMPLATE));
		await fileService.writeFile(joinPath(projectRoot, 'notes', 'ideas.md'), VSBuffer.fromString('# Ideas\n\n'));
		await fileService.writeFile(joinPath(projectRoot, 'characters', 'protagonist.md'), VSBuffer.fromString('# Protagonist\n\n'));
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

registerAction2(class NorrisConfigureOpenRouterAction extends Action2 {
	constructor() {
		super({
			id: NORRIS_CONFIGURE_OPENROUTER_COMMAND_ID,
			title: localize2('norrisWriter.configureOpenRouter', 'Configure OpenRouter...'),
			category: localize2('norrisWriter.category', 'Norris Writer'),
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		const languageModelsService = accessor.get(ILanguageModelsService);

		await commandService.executeCommand(MANAGE_CHAT_COMMAND_ID);
		await languageModelsService.openLanguageModelsProviderGroupSettings(OPENROUTER_VENDOR, OPENROUTER_GROUP);
	}
});
