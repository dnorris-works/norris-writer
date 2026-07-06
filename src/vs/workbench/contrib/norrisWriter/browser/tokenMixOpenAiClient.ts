/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { streamToBuffer } from '../../../../base/common/buffer.js';
import { IRequestService, asJson } from '../../../../platform/request/common/request.js';
import { IRequestOptions } from '../../../../base/parts/request/common/request.js';

export interface ITokenMixOpenAiMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ITokenMixModelInfo {
	id: string;
}

interface IOpenAiModelsResponse {
	data?: ITokenMixModelInfo[];
}

interface IOpenAiChatCompletionResponse {
	choices?: Array<{
		message?: { content?: string | null };
	}>;
	error?: { message?: string };
}

export class TokenMixOpenAiClient {

	constructor(
		private readonly requestService: IRequestService,
		private readonly baseUrl: string,
		private readonly apiKey: string,
	) { }

	async listModels(token: CancellationToken): Promise<ITokenMixModelInfo[]> {
		const context = await this.requestService.request(this._requestOptions('GET', `${this.baseUrl}/models`), token);
		if (context.res.statusCode && context.res.statusCode >= 400) {
			throw new Error(await this._readErrorMessage(context));
		}
		const body = await asJson<IOpenAiModelsResponse>(context);
		return body?.data?.filter(m => !!m.id) ?? [];
	}

	async chatCompletion(model: string, messages: ITokenMixOpenAiMessage[], token: CancellationToken): Promise<string> {
		const context = await this.requestService.request(this._requestOptions('POST', `${this.baseUrl}/chat/completions`, {
			model,
			messages,
			stream: false,
		}), token);
		if (context.res.statusCode && context.res.statusCode >= 400) {
			throw new Error(await this._readErrorMessage(context));
		}
		const body = await asJson<IOpenAiChatCompletionResponse>(context);
		if (!body) {
			throw new Error('TokenMix returned an empty response.');
		}
		if (body.error?.message) {
			throw new Error(body.error.message);
		}
		const content = body.choices?.[0]?.message?.content;
		if (typeof content !== 'string') {
			throw new Error('TokenMix returned an empty response.');
		}
		return content;
	}

	private _requestOptions(type: 'GET' | 'POST', url: string, body?: unknown): IRequestOptions {
		return {
			type,
			url,
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			data: body ? JSON.stringify(body) : undefined,
			callSite: 'tokenMixOpenAiClient',
		};
	}

	private async _readErrorMessage(context: Awaited<ReturnType<IRequestService['request']>>): Promise<string> {
		try {
			const buffer = await streamToBuffer(context.stream);
			const text = buffer.toString();
			try {
				const json = JSON.parse(text) as { error?: { message?: string } };
				if (json.error?.message) {
					return json.error.message;
				}
			} catch {
				// fall through
			}
			return text || `TokenMix request failed (${context.res.statusCode})`;
		} catch {
			return `TokenMix request failed (${context.res.statusCode})`;
		}
	}
}
