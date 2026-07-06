/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';

suite('Product Fallback Values', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	let fallbackBlock: string;

	suiteSetup(() => {
		// Navigate from out/vs/vs/platform/product/test/node/ up to the repo root,
		// then into src/vs/platform/product/common/product.ts
		const sourcePath = fileURLToPath(new URL('../../../../../../../src/vs/platform/product/common/product.ts', import.meta.url));
		const sourceContent = readFileSync(sourcePath, 'utf8');

		// Extract the fallback block: Object.assign inside `if (Object.keys(product).length === 0)`
		const match = sourceContent.match(/if \(Object\.keys\(product\)\.length === 0\) \{([\s\S]*?)\n\t\}/);
		assert.ok(match, 'fallback block not found in product.ts');
		fallbackBlock = match[1];
	});

	test('nameShort is "Norris Writer Dev"', () => {
		assert.ok(
			/nameShort:\s*'Norris Writer Dev'/.test(fallbackBlock),
			`Expected nameShort to be 'Norris Writer Dev' in the fallback block`
		);
	});

	test('nameLong is "Norris Writer Dev"', () => {
		assert.ok(
			/nameLong:\s*'Norris Writer Dev'/.test(fallbackBlock),
			`Expected nameLong to be 'Norris Writer Dev' in the fallback block`
		);
	});

	test('applicationName is "norris-writer"', () => {
		assert.ok(
			/applicationName:\s*'norris-writer'/.test(fallbackBlock),
			`Expected applicationName to be 'norris-writer' in the fallback block`
		);
	});

	test('dataFolderName is ".norris-writer"', () => {
		assert.ok(
			/dataFolderName:\s*'\.norris-writer'/.test(fallbackBlock),
			`Expected dataFolderName to be '.norris-writer' in the fallback block`
		);
	});

	test('urlProtocol is "norris-writer"', () => {
		assert.ok(
			/urlProtocol:\s*'norris-writer'/.test(fallbackBlock),
			`Expected urlProtocol to be 'norris-writer' in the fallback block`
		);
	});
});
