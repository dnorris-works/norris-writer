/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import {
	ChatMessageRole,
	IChatMessage,
	IChatResponsePart,
	ILanguageModelChatMetadata,
	ILanguageModelChatMetadataAndIdentifier,
	ILanguageModelChatProvider,
	ILanguageModelChatRequestOptions,
	ILanguageModelChatResponse,
} from '../../chat/common/languageModels.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
import {
	TOKENMIX_DEFAULT_BASE_URL,
	TOKENMIX_DEFAULT_MODEL,
	TOKENMIX_VENDOR_ID,
	TokenMixConfiguration,
} from '../common/tokenMixConstants.js';
import { ITokenMixCredentialService } from './tokenMixCredentialService.js';
import { ITokenMixOpenAiMessage, TokenMixOpenAiClient } from './tokenMixOpenAiClient.js';

export class TokenMixLanguageModelProvider extends Disposable implements ILanguageModelChatProvider {

	private readonly _onDidChange = this._register(new Emitter<void>());
	readonly onDidChange: Event<void> = this._onDidChange.event;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ITokenMixCredentialService private readonly credentialService: ITokenMixCredentialService,
		@IRequestService private readonly requestService: IRequestService,
	) {
		super();
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(TokenMixConfiguration.Enabled)
				|| e.affectsConfiguration(TokenMixConfiguration.BaseUrl)
				|| e.affectsConfiguration(TokenMixConfiguration.DefaultModel)) {
				this._onDidChange.fire();
			}
		}));
		this._register(this.credentialService.onDidChange(() => this._onDidChange.fire()));
	}

	async provideLanguageModelChatInfo(_options: unknown, token: CancellationToken): Promise<ILanguageModelChatMetadataAndIdentifier[]> {
		if (!this.configurationService.getValue<boolean>(TokenMixConfiguration.Enabled)) {
			return [];
		}

		const apiKey = await this.credentialService.getApiKey();
		if (!apiKey?.trim()) {
			return [];
		}

		const baseUrl = this._normalizeBaseUrl(this.configurationService.getValue<string>(TokenMixConfiguration.BaseUrl));
		const defaultModel = this.configurationService.getValue<string>(TokenMixConfiguration.DefaultModel) || TOKENMIX_DEFAULT_MODEL;
		const client = new TokenMixOpenAiClient(this.requestService, baseUrl, apiKey);

		let modelIds: string[] = [];
		try {
			const models = await client.listModels(token);
			modelIds = models.map(m => m.id);
		} catch {
			modelIds = [defaultModel];
		}

		if (!modelIds.includes(defaultModel)) {
			modelIds.unshift(defaultModel);
		}

		const uniqueIds = [...new Set(modelIds)];
		return uniqueIds.map(id => ({
			identifier: `${TOKENMIX_VENDOR_ID}/${id}`,
			metadata: this._createMetadata(id, id === defaultModel),
		}));
	}

	async sendChatRequest(
		modelIdentifier: string,
		messages: IChatMessage[],
		_from: ExtensionIdentifier | undefined,
		_options: ILanguageModelChatRequestOptions,
		token: CancellationToken,
	): Promise<ILanguageModelChatResponse> {
		const apiKey = await this.credentialService.getApiKey();
		if (!apiKey?.trim()) {
			throw new Error(localize('tokenMix.missingApiKey', "TokenMix API key is not configured. Run \"Norris Writer: Configure TokenMix...\" from the Command Palette."));
		}

		const modelId = this._resolveModelId(modelIdentifier);
		const baseUrl = this._normalizeBaseUrl(this.configurationService.getValue<string>(TokenMixConfiguration.BaseUrl));
		const client = new TokenMixOpenAiClient(this.requestService, baseUrl, apiKey);
		const openAiMessages = this._toOpenAiMessages(messages);

		const text = await client.chatCompletion(modelId, openAiMessages, token);

		async function* stream(): AsyncIterable<IChatResponsePart> {
			yield { type: 'text', value: text };
		}

		return {
			stream: stream(),
			result: Promise.resolve(undefined),
		};
	}

	async provideTokenCount(_modelIdentifier: string, message: string | IChatMessage, _token: CancellationToken): Promise<number> {
		const text = typeof message === 'string'
			? message
			: message.content.filter(p => p.type === 'text').map(p => p.value).join('');
		return Math.ceil(text.length / 4);
	}

	private _createMetadata(modelId: string, isDefault: boolean): ILanguageModelChatMetadata {
		return {
			extension: nullExtensionDescription.identifier,
			name: modelId,
			id: modelId,
			vendor: TOKENMIX_VENDOR_ID,
			version: '1.0',
			family: modelId,
			maxInputTokens: 128_000,
			maxOutputTokens: 16_384,
			isDefaultForLocation: isDefault ? { [ChatAgentLocation.Chat]: true } : {},
			isUserSelectable: true,
			isBYOK: true,
			capabilities: {
				vision: false,
				toolCalling: false,
				agentMode: false,
			},
		};
	}

	private _normalizeBaseUrl(baseUrl: string | undefined): string {
		const trimmed = (baseUrl || TOKENMIX_DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
		return trimmed || TOKENMIX_DEFAULT_BASE_URL;
	}

	private _resolveModelId(modelIdentifier: string): string {
		const prefix = `${TOKENMIX_VENDOR_ID}/`;
		if (modelIdentifier.startsWith(prefix)) {
			return modelIdentifier.slice(prefix.length);
		}
		return this.configurationService.getValue<string>(TokenMixConfiguration.DefaultModel) || TOKENMIX_DEFAULT_MODEL;
	}

	private _toOpenAiMessages(messages: IChatMessage[]): ITokenMixOpenAiMessage[] {
		const result: ITokenMixOpenAiMessage[] = [];
		for (const message of messages) {
			const text = message.content
				.filter(part => part.type === 'text')
				.map(part => part.value)
				.join('');
			if (!text) {
				continue;
			}
			switch (message.role) {
				case ChatMessageRole.System:
					result.push({ role: 'system', content: text });
					break;
				case ChatMessageRole.Assistant:
					result.push({ role: 'assistant', content: text });
					break;
				case ChatMessageRole.User:
				default:
					result.push({ role: 'user', content: text });
					break;
			}
		}
		return result;
	}
}
