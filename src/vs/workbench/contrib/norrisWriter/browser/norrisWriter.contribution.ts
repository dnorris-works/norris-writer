/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { ConfigurationTarget, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, IConfigurationRegistry } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { WORKSPACE_TRUST_ENABLED } from '../../../services/workspaces/common/workspaceTrust.js';
import { ChatConfiguration } from '../../chat/common/constants.js';
import {
	NorrisWriterEditorAppearance,
	NorrisWriterEditorAppearanceSetting,
} from '../common/editorAppearanceConstants.js';
import {
	NORRIS_CODEX_FOLDER_DEFAULT,
	NorrisWriterCodexConfiguration,
} from '../common/norrisWriterCodexConstants.js';
import {
	TOKENMIX_DEFAULT_BASE_URL,
	TOKENMIX_DEFAULT_MODEL,
	TokenMixConfiguration,
} from '../common/tokenMixConstants.js';
import './norrisWriterActions.js';
import './norrisWriterChatWelcomeActions.js';
import './norrisWriterCodexService.js';
import './norrisWriterEditorAppearance.js';
import './norrisWriterWordCount.js';
import './norrisWriterChatIntegration.js';
import './norrisWriterChatPlaceholder.js';
import './norrisWriterMarkdownFormatting.js';
import './tokenMixContribution.js';

Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerDefaultConfigurations([{
	overrides: {
		'workbench.startupEditor': 'welcomePage',
		'workbench.activityBar.location': 'top',
		'workbench.secondarySideBar.defaultVisibility': 'visibleInWorkspace',
		'git.enabled': true,
		'scm.defaultViewMode': 'tree',
		'workbench.welcomePage.experimentalOnboarding': false,
		'workbench.panel.defaultLocation': 'bottom',
		'zenMode.hideStatusBar': false,
		'zenMode.hideActivityBar': false,
		'norrisWriter.wordCount.enabled': true,
		'norrisWriter.markdown.alwaysRendered': true,
		[NorrisWriterEditorAppearanceSetting]: NorrisWriterEditorAppearance.Paper,
		'workbench.editorAssociations': {
			'*.md': 'vscode.markdown.editor',
		},
		[TokenMixConfiguration.Enabled]: true,
		[TokenMixConfiguration.BaseUrl]: TOKENMIX_DEFAULT_BASE_URL,
		[TokenMixConfiguration.DefaultModel]: TOKENMIX_DEFAULT_MODEL,
		[NorrisWriterCodexConfiguration.Enabled]: true,
		[NorrisWriterCodexConfiguration.Folder]: NORRIS_CODEX_FOLDER_DEFAULT,
		[WORKSPACE_TRUST_ENABLED]: false,
		[ChatConfiguration.TitleBarSignInEnabled]: false,
		[ChatConfiguration.DefaultNewSessionMode]: 'ask',
		[ChatConfiguration.AIDisabled]: false,
		[ChatConfiguration.ChatViewSessionsEnabled]: false,
	},
	source: 'norrisWriterDefaults'
}]);

class NorrisWriterTrustDisabler implements IWorkbenchContribution {
	constructor(@IConfigurationService configurationService: IConfigurationService) {
		if (configurationService.getValue<boolean>(WORKSPACE_TRUST_ENABLED) !== false) {
			configurationService.updateValue(WORKSPACE_TRUST_ENABLED, false, ConfigurationTarget.APPLICATION);
		}
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(NorrisWriterTrustDisabler, LifecyclePhase.Restored);

Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
	id: 'norrisWriter',
	order: 100,
	title: localize('norrisWriterConfigurationTitle', "Norris Writer"),
	type: 'object',
	properties: {
		'norrisWriter.wordCount.enabled': {
			type: 'boolean',
			default: true,
			order: 1,
			description: localize('norrisWriter.wordCount.enabled', "Show word count in the status bar for the active document."),
		},
		'norrisWriter.markdown.alwaysRendered': {
			type: 'boolean',
			default: true,
			order: 2,
			description: localize('norrisWriter.markdown.alwaysRendered', "In Writing View, keep text formatted while you edit (hide # and ** markers). Turn off to show raw Markdown syntax on the active paragraph."),
		},
		[NorrisWriterEditorAppearanceSetting]: {
			type: 'string',
			enum: [NorrisWriterEditorAppearance.FollowTheme, NorrisWriterEditorAppearance.Paper],
			enumDescriptions: [
				localize('norrisWriter.editor.appearance.followTheme', "Use the active color theme for editor background and text."),
				localize('norrisWriter.editor.appearance.paper', "Use a warm cream page with black text in manuscript editors only, ignoring the theme."),
			],
			default: NorrisWriterEditorAppearance.Paper,
			order: 3,
			title: localize('norrisWriter.editor.appearance.title', "Editor appearance"),
			description: localize('norrisWriter.editor.appearance', "Controls whether Markdown manuscript editors use the color theme or a fixed cream paper style with black text. Does not change Settings, sidebars, or other workbench UI."),
		},
		[TokenMixConfiguration.Enabled]: {
			type: 'boolean',
			default: true,
			order: 10,
			tags: ['tokenMix'],
			title: localize('norrisWriter.tokenMix.enabled.title', "TokenMix: Enabled"),
			description: localize('norrisWriter.tokenMix.enabled', "Enable TokenMix as the AI provider for Norris Writer chat."),
		},
		[TokenMixConfiguration.ApiKey]: {
			type: 'string',
			default: '',
			order: 11,
			tags: ['tokenMix'],
			title: localize('norrisWriter.tokenMix.apiKey.title', "TokenMix: API Key"),
			description: localize('norrisWriter.tokenMix.apiKey', "Your TokenMix API key. Get one at tokenmix.ai. Used for chat completions via the OpenAI-compatible TokenMix API."),
		},
		[TokenMixConfiguration.BaseUrl]: {
			type: 'string',
			default: TOKENMIX_DEFAULT_BASE_URL,
			order: 12,
			tags: ['tokenMix'],
			title: localize('norrisWriter.tokenMix.baseUrl.title', "TokenMix: Base URL"),
			description: localize('norrisWriter.tokenMix.baseUrl', "TokenMix API base URL (default https://api.tokenmix.ai/v1)."),
		},
		[TokenMixConfiguration.DefaultModel]: {
			type: 'string',
			default: TOKENMIX_DEFAULT_MODEL,
			order: 13,
			tags: ['tokenMix'],
			title: localize('norrisWriter.tokenMix.defaultModel.title', "TokenMix: Default Model"),
			description: localize('norrisWriter.tokenMix.defaultModel', "Default TokenMix model id when none is selected in chat (for example gpt-4o-mini)."),
		},
		[NorrisWriterCodexConfiguration.Enabled]: {
			type: 'boolean',
			default: true,
			order: 20,
			tags: ['codex'],
			title: localize('norrisWriter.codex.enabled.title', "Codex: Enabled"),
			description: localize('norrisWriter.codex.enabled', "Automatically inject project codex entries into Writing Assistant prompts."),
		},
		[NorrisWriterCodexConfiguration.Folder]: {
			type: 'string',
			default: NORRIS_CODEX_FOLDER_DEFAULT,
			order: 21,
			tags: ['codex'],
			title: localize('norrisWriter.codex.folder.title', "Codex: Folder"),
			description: localize('norrisWriter.codex.folder', "Folder name (relative to the workspace root) containing codex entry files."),
		},
	},
});
