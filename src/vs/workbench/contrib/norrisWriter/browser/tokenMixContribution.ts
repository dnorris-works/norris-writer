/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { Extensions as WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { ILanguageModelsService } from '../../chat/common/languageModels.js';
import {
	NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID,
	TOKENMIX_VENDOR_ID,
	TokenMixConfiguration,
} from '../common/tokenMixConstants.js';
import { ITokenMixCredentialService, TokenMixCredentialService } from './tokenMixCredentialService.js';
import { TokenMixLanguageModelProvider } from './tokenMixLanguageModelProvider.js';

registerSingleton(ITokenMixCredentialService, TokenMixCredentialService, InstantiationType.Delayed);

class TokenMixContribution extends Disposable implements IWorkbenchContribution {

	constructor(
		@ILanguageModelsService languageModelsService: ILanguageModelsService,
		@ITokenMixCredentialService credentialService: ITokenMixCredentialService,
		@IChatEntitlementService chatEntitlementService: IChatEntitlementService,
		@IConfigurationService configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		const provider = this._register(instantiationService.createInstance(TokenMixLanguageModelProvider));

		const vendorDescriptor = {
			vendor: TOKENMIX_VENDOR_ID,
			displayName: 'TokenMix',
			configuration: undefined,
			managementCommand: NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID,
			when: undefined,
		};

		languageModelsService.deltaLanguageModelChatProviderDescriptors([vendorDescriptor], []);
		this._register({ dispose: () => languageModelsService.deltaLanguageModelChatProviderDescriptors([], [vendorDescriptor]) });
		this._register(languageModelsService.registerLanguageModelProvider(TOKENMIX_VENDOR_ID, provider));

		const refreshModels = async () => {
			if (!configurationService.getValue<boolean>(TokenMixConfiguration.Enabled)) {
				return;
			}
			if (!(await credentialService.hasApiKey())) {
				return;
			}
			chatEntitlementService.markSetupCompleted();
			await languageModelsService.selectLanguageModels({ vendor: TOKENMIX_VENDOR_ID });
		};

		this._register(credentialService.onDidChange(() => { refreshModels(); }));
		this._register(configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(TokenMixConfiguration.Enabled)
				|| e.affectsConfiguration(TokenMixConfiguration.ApiKey)
				|| e.affectsConfiguration(TokenMixConfiguration.BaseUrl)
				|| e.affectsConfiguration(TokenMixConfiguration.DefaultModel)) {
				refreshModels();
			}
		}));
		refreshModels();
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(TokenMixContribution, LifecyclePhase.Restored);

registerAction2(class ConfigureTokenMixAction extends Action2 {
	constructor() {
		super({
			id: NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID,
			title: localize2('norrisWriter.configureTokenMix', 'Configure TokenMix...'),
			category: localize2('norrisWriter.category', 'Norris Writer'),
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const configurationService = accessor.get(IConfigurationService);
		const preferencesService = accessor.get(IPreferencesService);

		if (!configurationService.getValue<boolean>(TokenMixConfiguration.Enabled)) {
			await configurationService.updateValue(TokenMixConfiguration.Enabled, true);
		}

		await preferencesService.openSettings({ query: '@tag:tokenMix' });
	}
});
