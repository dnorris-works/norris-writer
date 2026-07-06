/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';

suite('product.json - Norris Writer Identity', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	let product: Record<string, unknown>;

	suiteSetup(() => {
		// Navigate from out/vs/platform/product/test/node/ up to the repo root
		const productJsonPath = fileURLToPath(new URL('../../../../../../product.json', import.meta.url));
		const raw = readFileSync(productJsonPath, 'utf-8');
		product = JSON.parse(raw);
	});

	test('product.json is valid JSON', () => {
		assert.ok(product, 'product.json should be parseable as valid JSON');
		assert.strictEqual(typeof product, 'object', 'product.json should be a JSON object');
	});

	test('core identity fields have expected Norris Writer values', () => {
		assert.deepStrictEqual({
			nameShort: product['nameShort'],
			nameLong: product['nameLong'],
			applicationName: product['applicationName'],
			dataFolderName: product['dataFolderName'],
			sharedDataFolderName: product['sharedDataFolderName'],
			serverApplicationName: product['serverApplicationName'],
			serverDataFolderName: product['serverDataFolderName'],
			enableCli: product['enableCli'],
			urlProtocol: product['urlProtocol'],
			linuxIconName: product['linuxIconName'],
		}, {
			nameShort: 'Norris Writer',
			nameLong: 'Norris Writer',
			applicationName: 'norris-writer',
			dataFolderName: '.norris-writer',
			sharedDataFolderName: '.norris-writer-shared',
			serverApplicationName: 'norris-writer-server',
			serverDataFolderName: '.norris-writer-server',
			enableCli: false,
			urlProtocol: 'norris-writer',
			linuxIconName: 'norris-writer',
		});
	});

	test('tunnel CLI is not configured', () => {
		assert.strictEqual(product['tunnelApplicationName'], undefined, 'tunnelApplicationName should be unset for a GUI-only app');
	});

	test('Windows App IDs are valid Inno Setup GUID format', () => {
		const appIdFields = [
			'win32x64AppId',
			'win32arm64AppId',
			'win32x64UserAppId',
			'win32arm64UserAppId',
		] as const;

		// Inno Setup GUID format: {{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}
		const innoSetupGuidPattern = /^\{\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}$/;

		for (const field of appIdFields) {
			const value = product[field];
			assert.strictEqual(typeof value, 'string', `${field} should be a string`);
			assert.ok(innoSetupGuidPattern.test(value as string), `${field} value "${value}" should match Inno Setup GUID format {{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}`);
		}
	});

	test('all four Windows App IDs are distinct from each other', () => {
		const appIds = [
			product['win32x64AppId'],
			product['win32arm64AppId'],
			product['win32x64UserAppId'],
			product['win32arm64UserAppId'],
		];

		const uniqueIds = new Set(appIds);
		assert.strictEqual(uniqueIds.size, 4, `All four Windows App IDs must be distinct, got: ${JSON.stringify(appIds)}`);
	});

	test('darwinProfileUUID and darwinProfilePayloadUUID are valid UUIDs', () => {
		const uuidPattern = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;

		const profileUUID = product['darwinProfileUUID'];
		assert.strictEqual(typeof profileUUID, 'string', 'darwinProfileUUID should be a string');
		assert.ok(uuidPattern.test(profileUUID as string), `darwinProfileUUID value "${profileUUID}" should be a valid UUID`);

		const payloadUUID = product['darwinProfilePayloadUUID'];
		assert.strictEqual(typeof payloadUUID, 'string', 'darwinProfilePayloadUUID should be a string');
		assert.ok(uuidPattern.test(payloadUUID as string), `darwinProfilePayloadUUID value "${payloadUUID}" should be a valid UUID`);

		assert.notStrictEqual(profileUUID, payloadUUID, 'darwinProfileUUID and darwinProfilePayloadUUID should be different');
	});
});
