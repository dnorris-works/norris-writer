/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ConfigurationTarget, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { TOKENMIX_API_KEY_SECRET, TokenMixConfiguration } from '../common/tokenMixConstants.js';

export const ITokenMixCredentialService = createDecorator<ITokenMixCredentialService>('tokenMixCredentialService');

export interface ITokenMixCredentialService {
	readonly _serviceBrand: undefined;
	readonly onDidChange: Event<void>;
	getApiKey(): Promise<string | undefined>;
	setApiKey(apiKey: string): Promise<void>;
	deleteApiKey(): Promise<void>;
	hasApiKey(): Promise<boolean>;
}

export class TokenMixCredentialService extends Disposable implements ITokenMixCredentialService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChange = this._register(new Emitter<void>());
	readonly onDidChange = this._onDidChange.event;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ISecretStorageService private readonly secretStorageService: ISecretStorageService,
	) {
		super();
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(TokenMixConfiguration.ApiKey)) {
				this._onDidChange.fire();
			}
		}));
	}

	async getApiKey(): Promise<string | undefined> {
		const fromSettings = this._readFromSettings();
		if (fromSettings) {
			return fromSettings;
		}

		// One-time migration from the earlier secret-storage-only build.
		const legacy = await this.secretStorageService.get(TOKENMIX_API_KEY_SECRET);
		if (legacy?.trim()) {
			await this.setApiKey(legacy);
			await this.secretStorageService.delete(TOKENMIX_API_KEY_SECRET);
			return legacy.trim();
		}

		return undefined;
	}

	async setApiKey(apiKey: string): Promise<void> {
		const trimmed = apiKey.trim();
		await this.configurationService.updateValue(
			TokenMixConfiguration.ApiKey,
			trimmed || undefined,
			ConfigurationTarget.USER,
		);
		this._onDidChange.fire();
	}

	async deleteApiKey(): Promise<void> {
		await this.setApiKey('');
		await this.secretStorageService.delete(TOKENMIX_API_KEY_SECRET);
	}

	async hasApiKey(): Promise<boolean> {
		const key = await this.getApiKey();
		return !!key?.trim();
	}

	private _readFromSettings(): string | undefined {
		const value = this.configurationService.getValue<string>(TokenMixConfiguration.ApiKey);
		return value?.trim() || undefined;
	}
}
