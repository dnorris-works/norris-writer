/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { IChatAgentHistoryEntry, IChatAgentImplementation, IChatAgentRequest, IChatAgentResult, IChatAgentService } from '../../chat/common/participants/chatAgents.js';
import { ChatAgentLocation, ChatModeKind } from '../../chat/common/constants.js';
import { IChatProgress } from '../../chat/common/chatService/chatService.js';
import { IChatProgressHistoryResponseContent } from '../../chat/common/model/chatModel.js';
import { IChatTaskDto } from '../../chat/common/chatService/chatService.js';
import { ChatMessageRole, ILanguageModelsService } from '../../chat/common/languageModels.js';
import {
	NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID,
	TOKENMIX_VENDOR_ID,
	TokenMixConfiguration,
} from '../common/tokenMixConstants.js';
import { ITokenMixCredentialService } from './tokenMixCredentialService.js';

const NORRIS_WRITER_AGENT_ID = 'norris.writer.assistant';
const NORRIS_WRITER_EXTENSION_ID = new ExtensionIdentifier('norris.writer');

const WRITING_SYSTEM_PROMPT = [
	'You are a fiction writing assistant in Norris Writer.',
	'Help the author brainstorm, draft, revise, develop characters, and refine plot and prose.',
	'Be creative, clear, and concise. Match the author\'s genre and tone when known.',
	'When suggesting rewrites, preserve the author\'s voice unless they ask otherwise.',
].join(' ');

class NorrisWriterWritingAssistant implements IChatAgentImplementation {

	constructor(
		@ILanguageModelsService private readonly languageModelsService: ILanguageModelsService,
		@ITokenMixCredentialService private readonly credentialService: ITokenMixCredentialService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) { }

	async invoke(
		request: IChatAgentRequest,
		progress: (parts: IChatProgress[]) => void,
		history: IChatAgentHistoryEntry[],
		token: CancellationToken,
	): Promise<IChatAgentResult> {
		if (!this.configurationService.getValue<boolean>(TokenMixConfiguration.Enabled)) {
			this._showSetupMessage(progress, localize(
				'norrisWriter.chat.tokenMixDisabled',
				"TokenMix is disabled. Enable **Norris Writer > TokenMix: Enabled** in Settings, then configure your API key."
			));
			return {};
		}

		if (!(await this.credentialService.hasApiKey())) {
			this._showSetupMessage(progress, localize(
				'norrisWriter.chat.tokenMixNotConfigured',
				"Connect TokenMix to start writing with AI.\n\nOpen **Settings**, search for **TokenMix**, and enter your API key. Get one at [tokenmix.ai](https://tokenmix.ai/docs)."
			));
			return {};
		}

		const modelId = await this._resolveModelId(request.userSelectedModelId);
		if (!modelId) {
			this._showSetupMessage(progress, localize(
				'norrisWriter.chat.tokenMixNoModels',
				"No TokenMix models are available. Check your API key and base URL in Settings, then try again."
			));
			return { errorDetails: { message: localize('norrisWriter.chat.noModels', "No TokenMix models available."), isExpectedError: true } };
		}

		try {
			const messages = this._buildMessages(history, request.message);
			const response = await this.languageModelsService.sendChatRequest(modelId, undefined, messages, {}, token);

			let text = '';
			for await (const part of response.stream) {
				if (token.isCancellationRequested) {
					return {};
				}
				const parts = Array.isArray(part) ? part : [part];
				for (const p of parts) {
					if (p.type === 'text') {
						text += p.value;
						progress([{ kind: 'markdownContent', content: new MarkdownString(text, { isTrusted: false }) }]);
					}
				}
			}
			await response.result;

			if (!text.trim()) {
				this._showSetupMessage(progress, localize('norrisWriter.chat.emptyResponse', "TokenMix returned an empty response."));
			}
			return {};
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return { errorDetails: { message, isExpectedError: true } };
		}
	}

	private _showSetupMessage(progress: (parts: IChatProgress[]) => void, body: string): void {
		const content = new MarkdownString(body, {
			isTrusted: { enabledCommands: [NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID, 'workbench.action.openSettings'] },
		});
		content.appendMarkdown(`\n\n[Configure TokenMix](command:${NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID})`);
		progress([{ kind: 'markdownContent', content }]);
	}

	private async _resolveModelId(userSelectedModelId: string | undefined): Promise<string | undefined> {
		if (userSelectedModelId) {
			const metadata = this.languageModelsService.lookupLanguageModel(userSelectedModelId);
			if (metadata?.vendor === TOKENMIX_VENDOR_ID) {
				return userSelectedModelId;
			}
		}

		const tokenMixModels = await this.languageModelsService.selectLanguageModels({ vendor: TOKENMIX_VENDOR_ID });
		if (tokenMixModels.length) {
			return tokenMixModels[0];
		}

		const defaultModel = this.configurationService.getValue<string>(TokenMixConfiguration.DefaultModel);
		if (defaultModel) {
			const candidate = `${TOKENMIX_VENDOR_ID}/${defaultModel}`;
			if (this.languageModelsService.lookupLanguageModel(candidate)) {
				return candidate;
			}
		}

		return undefined;
	}

	private _buildMessages(history: IChatAgentHistoryEntry[], userMessage: string) {
		const messages = [{ role: ChatMessageRole.System, content: [{ type: 'text' as const, value: WRITING_SYSTEM_PROMPT }] }];

		for (const entry of history) {
			messages.push({ role: ChatMessageRole.User, content: [{ type: 'text' as const, value: entry.request.message }] });
			const assistantText = extractAssistantText(entry.response);
			if (assistantText) {
				messages.push({ role: ChatMessageRole.Assistant, content: [{ type: 'text' as const, value: assistantText }] });
			}
		}

		messages.push({ role: ChatMessageRole.User, content: [{ type: 'text' as const, value: userMessage }] });
		return messages;
	}
}

function extractAssistantText(response: ReadonlyArray<IChatProgressHistoryResponseContent | IChatTaskDto>): string {
	let text = '';
	for (const part of response) {
		if (part.kind === 'markdownContent') {
			text += part.content.value;
		}
	}
	return text.trim();
}

class NorrisWriterChatContribution extends Disposable implements IWorkbenchContribution {

	constructor(
		@IChatAgentService chatAgentService: IChatAgentService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		const agent = instantiationService.createInstance(NorrisWriterWritingAssistant);
		this._register(chatAgentService.registerAgent(NORRIS_WRITER_AGENT_ID, {
			id: NORRIS_WRITER_AGENT_ID,
			name: 'assistant',
			fullName: localize2('norrisWriter.chatAgent.fullName', 'Writing Assistant').value,
			description: localize2('norrisWriter.chatAgent.description', 'Fiction writing assistant powered by TokenMix').value,
			extensionId: NORRIS_WRITER_EXTENSION_ID,
			extensionVersion: undefined,
			extensionPublisherId: 'norris',
			extensionDisplayName: 'Norris Writer',
			publisherDisplayName: 'Norris Writer',
			isDefault: true,
			isCore: true,
			isDynamic: true,
			metadata: {
				additionalWelcomeMessage: localize(
					'norrisWriter.chatAgent.welcomeMessage',
					'Ask me to brainstorm, draft, revise, or polish your fiction. Configure TokenMix in Settings if you have not already.',
				),
			},
			slashCommands: [],
			locations: [ChatAgentLocation.Chat],
			modes: [ChatModeKind.Ask, ChatModeKind.Agent, ChatModeKind.Edit],
			disambiguation: [],
		}));
		this._register(chatAgentService.registerAgentImplementation(NORRIS_WRITER_AGENT_ID, agent));
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(NorrisWriterChatContribution, LifecyclePhase.Restored);
