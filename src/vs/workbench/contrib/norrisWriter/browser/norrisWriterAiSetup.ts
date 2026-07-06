/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ConfigurationTarget, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { Extensions as WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from '../../../common/contributions.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { ChatConfiguration } from '../../chat/common/constants.js';
import { ILanguageModelsService } from '../../chat/common/languageModels.js';
import { NORRIS_CONFIGURE_OPENROUTER_COMMAND_ID } from './norrisWriterActions.js';

const CHAT_ALLOW_ANONYMOUS = 'chat.allowAnonymousAccess';
const COPILOT_COMPLETIONS = 'github.copilot.enable';
const EXTENSION_SETUP_COMMAND = 'workbench.action.chat.triggerSetupAnonymousWithoutDialog';
const OPENROUTER_VENDOR = 'openrouter';
const OPENROUTER_GROUP = 'OpenRouter';
const OPENROUTER_PROMPTED_KEY = 'norrisWriter.openRouter.prompted';

export class NorrisWriterAiSetup extends Disposable implements IWorkbenchContribution {

	constructor(
		@ICommandService private readonly commandService: ICommandService,
		@IChatEntitlementService private readonly chatEntitlementService: IChatEntitlementService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILanguageModelsService private readonly languageModelsService: ILanguageModelsService,
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();

		this.ensureAiSettings();
		this._register(this.chatEntitlementService.onDidChangeSentiment(() => {
			void this.ensureExtensionReady();
			void this.promptOpenRouterIfNeeded();
		}));
		this._register(this.chatEntitlementService.onDidChangeEntitlement(() => void this.promptOpenRouterIfNeeded()));
		void this.ensureExtensionReady();
		void this.promptOpenRouterIfNeeded();
	}

	private ensureAiSettings(): void {
		const settings: [string, unknown][] = [
			[CHAT_ALLOW_ANONYMOUS, false],
			[ChatConfiguration.TitleBarSignInEnabled, false],
			[COPILOT_COMPLETIONS, false],
		];
		for (const [key, value] of settings) {
			if (this.configurationService.getValue(key) !== value) {
				this.configurationService.updateValue(key, value, ConfigurationTarget.APPLICATION);
			}
		}
	}

	private async ensureExtensionReady(): Promise<void> {
		if (this.chatEntitlementService.sentiment.completed) {
			return;
		}
		await this.commandService.executeCommand(EXTENSION_SETUP_COMMAND);
	}

	private async promptOpenRouterIfNeeded(): Promise<void> {
		if (!this.chatEntitlementService.sentiment.completed) {
			return;
		}
		if (this.chatEntitlementService.hasByokModels || this.hasOpenRouterApiKey()) {
			return;
		}
		if (this.storageService.getBoolean(OPENROUTER_PROMPTED_KEY, StorageScope.APPLICATION, false)) {
			return;
		}

		this.storageService.store(OPENROUTER_PROMPTED_KEY, true, StorageScope.APPLICATION, StorageTarget.MACHINE);
		await this.commandService.executeCommand(NORRIS_CONFIGURE_OPENROUTER_COMMAND_ID);
	}

	private hasOpenRouterApiKey(): boolean {
		return this.languageModelsService.getLanguageModelIds().some(id => {
			return this.languageModelsService.lookupLanguageModel(id)?.vendor === OPENROUTER_VENDOR;
		});
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(NorrisWriterAiSetup, LifecyclePhase.Eventually);
