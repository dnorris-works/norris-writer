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
import './norrisWriterActions.js';
import './norrisWriterWordCount.js';
import './norrisWriterAiSetup.js';

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
		[WORKSPACE_TRUST_ENABLED]: false,
		'chat.allowAnonymousAccess': false,
		[ChatConfiguration.TitleBarSignInEnabled]: false,
		'github.copilot.enable': false,
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
	title: localize('norrisWriterConfigurationTitle', "Norris Writer"),
	type: 'object',
	properties: {
		'norrisWriter.wordCount.enabled': {
			type: 'boolean',
			default: true,
			description: localize('norrisWriter.wordCount.enabled', "Show word count in the status bar for the active document."),
		},
	},
});
