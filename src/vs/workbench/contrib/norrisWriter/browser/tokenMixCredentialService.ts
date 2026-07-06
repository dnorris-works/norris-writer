/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { TOKENMIX_API_KEY_SECRET } from '../common/tokenMixConstants.js';

export const ITokenMixCredentialService = createDecorator<ITokenMixCredentialService>('tokenMixCredentialService');

export interface ITokenMixCredentialService {
	readonly _serviceBrand: undefined;
	readonly onDidChange: Event<void>;
	getApiKey(): Promise<string | undefined>;
	setApiKey(apiKey: string): Promise<void>;
	deleteApiKey(): Promise<void>;
	hasApiKey(): Promise<boolean>;
}

export class TokenMixCredentialService implements ITokenMixCredentialService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChange = new Emitter<void>();
	readonly onDidChange = this._onDidChange.event;

	constructor(
		@ISecretStorageService private readonly secretStorageService: ISecretStorageService,
	) { }

	getApiKey(): Promise<string | undefined> {
		return this.secretStorageService.get(TOKENMIX_API_KEY_SECRET);
	}

	async setApiKey(apiKey: string): Promise<void> {
		const trimmed = apiKey.trim();
		if (!trimmed) {
			await this.deleteApiKey();
			return;
		}
		await this.secretStorageService.set(TOKENMIX_API_KEY_SECRET, trimmed);
		this._onDidChange.fire();
	}

	async deleteApiKey(): Promise<void> {
		await this.secretStorageService.delete(TOKENMIX_API_KEY_SECRET);
		this._onDidChange.fire();
	}

	async hasApiKey(): Promise<boolean> {
		const key = await this.getApiKey();
		return !!key?.trim();
	}
}
