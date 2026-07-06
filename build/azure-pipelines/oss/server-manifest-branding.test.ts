/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Integration test for server manifest branding (resources/server/manifest.json).
 *
 *  Run:  npx tsx server-manifest-branding.test.ts
 *
 *  Verifies:
 *    1. manifest.json is valid JSON
 *    2. `name` field is "Norris Writer"
 *    3. `short_name` field is "Norris Writer"
 *--------------------------------------------------------------------------------------------*/

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean): void {
	if (cond) {
		passed++;
		console.log(`  ok   ${name}`);
	} else {
		failed++;
		console.error(`  FAIL ${name}`);
	}
}

// -- Server manifest branding -------------------------------------------------
console.log('Server manifest branding (resources/server/manifest.json):');

const manifestPath = path.resolve(import.meta.dirname, '../../../resources/server/manifest.json');
const raw = fs.readFileSync(manifestPath, 'utf-8');

// Verify the file is valid JSON
let manifest: Record<string, unknown>;
try {
	manifest = JSON.parse(raw);
	check('manifest.json is valid JSON', true);
} catch (e) {
	check('manifest.json is valid JSON', false);
	console.error('  Parse error:', e);
	process.exit(1);
}

// Verify branding fields
check('name is "Norris Writer"', manifest['name'] === 'Norris Writer');
check('short_name is "Norris Writer"', manifest['short_name'] === 'Norris Writer');

// -- summary ------------------------------------------------------------------
console.log('');
console.log(`Server manifest branding checks: ${passed} passed, ${failed} failed`);
if (failed > 0) {
	process.exit(1);
}
