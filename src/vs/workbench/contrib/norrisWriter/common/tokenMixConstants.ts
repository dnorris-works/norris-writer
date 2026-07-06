/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const TOKENMIX_VENDOR_ID = 'tokenmix';

export const TOKENMIX_DEFAULT_BASE_URL = 'https://api.tokenmix.ai/v1';

export const TOKENMIX_DEFAULT_MODEL = 'gpt-4o-mini';

/** Secret storage key (without the `secret://` prefix). */
export const TOKENMIX_API_KEY_SECRET = 'norrisWriter.tokenMix.apiKey';

export const enum TokenMixConfiguration {
	Enabled = 'norrisWriter.tokenMix.enabled',
	BaseUrl = 'norrisWriter.tokenMix.baseUrl',
	DefaultModel = 'norrisWriter.tokenMix.defaultModel',
	ApiKey = 'norrisWriter.tokenMix.apiKey',
}

export const NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID = 'norrisWriter.configureTokenMix';
