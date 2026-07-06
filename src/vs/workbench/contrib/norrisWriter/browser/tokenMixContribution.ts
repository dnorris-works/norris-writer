/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ConfigurationScope, Extensions, IConfigurationRegistry } from '../../../../platform/configuration/common/configurationRegistry.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { Extensions as WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { ILanguageModelsService } from '../../chat/common/languageModels.js';
import {
	NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID,
	TOKENMIX_DEFAULT_BASE_URL,
	TOKENMIX_DEFAULT_MODEL,
	TOKENMIX_VENDOR_ID,
	TokenMixConfiguration,
} from '../common/tokenMixConstants.js';
import { ITokenMixCredentialService, TokenMixCredentialService } from './tokenMixCredentialService.js';
import { TokenMixLanguageModelProvider } from './tokenMixLanguageModelProvider.js';

registerSingleton(ITokenMixCredentialService, TokenMixCredentialService, InstantiationType.Delayed);

Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
	id: 'norrisWriterTokenMix',
	order: 11,
	title: localize('norrisWriterTokenMixConfigurationTitle', "TokenMix"),
	type: 'object',
	scope: ConfigurationScope.APPLICATION,
	properties: {
		[TokenMixConfiguration.Enabled]: {
			type: 'boolean',
			default: true,
			description: localize('norrisWriter.tokenMix.enabled', "Enable TokenMix as the AI provider for Norris Writer chat."),
			order: 1,
		},
		[TokenMixConfiguration.BaseUrl]: {
			type: 'string',
			default: TOKENMIX_DEFAULT_BASE_URL,
			description: localize('norrisWriter.tokenMix.baseUrl', "TokenMix API base URL. The TokenMix docs use https://api.tokenmix.ai/v1."),
			order: 2,
		},
		[TokenMixConfiguration.DefaultModel]: {
			type: 'string',
			default: TOKENMIX_DEFAULT_MODEL,
			description: localize('norrisWriter.tokenMix.defaultModel', "Default model id when none is selected in chat (for example gpt-4o-mini)."),
			order: 3,
		},
	},
});

class TokenMixContribution extends Disposable implements IWorkbenchContribution {

	constructor(
		@ILanguageModelsService languageModelsService: ILanguageModelsService,
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
		const quickInputService = accessor.get(IQuickInputService);
		const credentialService = accessor.get(ITokenMixCredentialService);
		const configurationService = accessor.get(IConfigurationService);
		const preferencesService = accessor.get(IPreferencesService);

		const hasKey = await credentialService.hasApiKey();
		const apiKey = await quickInputService.input({
			title: localize('norrisWriter.configureTokenMix.title', 'Configure TokenMix'),
			prompt: localize('norrisWriter.configureTokenMix.prompt', 'Enter your TokenMix API key from tokenmix.ai. Leave blank to keep the current key.'),
			password: true,
			placeHolder: hasKey
				? localize('norrisWriter.configureTokenMix.placeholderExisting', '********  (leave blank to keep current key)')
				: localize('norrisWriter.configureTokenMix.placeholderNew', 'Paste your API key'),
		});

		if (apiKey === undefined) {
			return;
		}

		if (apiKey.trim()) {
			await credentialService.setApiKey(apiKey);
		}

		if (!configurationService.getValue<boolean>(TokenMixConfiguration.Enabled)) {
			await configurationService.updateValue(TokenMixConfiguration.Enabled, true);
		}

		await preferencesService.openSettings({
			query: `@id:${TokenMixConfiguration.Enabled} @id:${TokenMixConfiguration.BaseUrl} @id:${TokenMixConfiguration.DefaultModel}`,
		});
	}
});
