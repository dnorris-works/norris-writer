/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NorrisWriterCodexAiContext, NorrisWriterCodexEntryType } from '../../common/norrisWriterCodexConstants.js';
import { CodexDatabase } from '../../node/codexDatabase.js';

suite('Norris Writer - CodexDatabase', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	let db: CodexDatabase;

	setup(async () => {
		db = await CodexDatabase.open(':memory:');
	});

	teardown(async () => {
		await db.dispose();
	});

	test('migrations create schema v1', async () => {
		const info = await db.getDatabaseInfo();
		assert.strictEqual(info.schemaVersion, 1);
		assert.strictEqual(info.path, ':memory:');
	});

	test('pen name → story → entry → alias → relationship CRUD', async () => {
		const penName = await db.createPenName({ name: 'Alex Author' });
		const story = await db.createStory({ penNameId: penName.id, title: 'The Harbor', workspacePath: '/tmp/harbor' });

		const entryA = await db.createEntry({
			storyId: story.id,
			entryType: NorrisWriterCodexEntryType.Character,
			title: 'Elena',
			body: 'Captain of the harbor guard.',
			aiContext: NorrisWriterCodexAiContext.WhenDetected,
			aliases: ['Captain Reyes'],
		});

		const entryB = await db.createEntry({
			storyId: story.id,
			entryType: NorrisWriterCodexEntryType.Location,
			title: 'Warehouse District',
			body: 'Foggy docks east of the old market.',
		});

		const relationship = await db.createRelationship({
			storyId: story.id,
			fromEntryId: entryA.id,
			toEntryId: entryB.id,
			relationshipType: 'patrols',
			notes: 'Night shift route',
		});

		assert.strictEqual((await db.listPenNames()).length, 1);
		assert.strictEqual((await db.listStories()).length, 1);
		assert.strictEqual((await db.listStories(penName.id)).length, 1);
		assert.strictEqual((await db.listEntries(story.id)).length, 2);

		const loadedEntry = await db.getEntry(entryA.id);
		assert.ok(loadedEntry);
		assert.deepStrictEqual(loadedEntry.aliases, ['Captain Reyes']);
		assert.strictEqual(loadedEntry.body, 'Captain of the harbor guard.');

		const updated = await db.updateEntry(entryA.id, { body: 'Harbor captain, wary of strangers.' });
		assert.strictEqual(updated?.body, 'Harbor captain, wary of strangers.');

		const rels = await db.listRelationships(story.id, entryA.id);
		assert.strictEqual(rels.length, 1);
		assert.strictEqual(rels[0].id, relationship.id);
		assert.strictEqual(rels[0].relationshipType, 'patrols');

		const aliasUpdated = await db.setEntryAliases(entryA.id, ['Captain Reyes', 'Elena Reyes']);
		assert.deepStrictEqual(aliasUpdated?.aliases, ['Captain Reyes', 'Elena Reyes']);

		assert.strictEqual(await db.deleteRelationship(relationship.id), true);
		assert.strictEqual((await db.listRelationships(story.id)).length, 0);

		assert.strictEqual(await db.deleteEntry(entryB.id), true);
		assert.strictEqual((await db.listEntries(story.id)).length, 1);
	});

	test('deleting story cascades entries and relationships', async () => {
		const penName = await db.createPenName({ name: 'Cascade Test' });
		const story = await db.createStory({ penNameId: penName.id, title: 'One Shot' });

		const a = await db.createEntry({
			storyId: story.id,
			entryType: NorrisWriterCodexEntryType.Lore,
			title: 'Magic Rule',
			body: 'No resurrection.',
		});
		const b = await db.createEntry({
			storyId: story.id,
			entryType: NorrisWriterCodexEntryType.Character,
			title: 'Mira',
			body: 'Apprentice.',
		});
		await db.createRelationship({
			storyId: story.id,
			fromEntryId: a.id,
			toEntryId: b.id,
			relationshipType: 'constrains',
		});

		assert.strictEqual(await db.deleteStory(story.id), true);
		assert.strictEqual((await db.listEntries(story.id)).length, 0);
		assert.strictEqual((await db.listRelationships(story.id)).length, 0);
		assert.strictEqual(await db.getEntry(a.id), undefined);
	});

	test('relationship rejects entries from another story', async () => {
		const penName = await db.createPenName({ name: 'Cross Story' });
		const storyA = await db.createStory({ penNameId: penName.id, title: 'Book A' });
		const storyB = await db.createStory({ penNameId: penName.id, title: 'Book B' });
		const entryA = await db.createEntry({
			storyId: storyA.id,
			entryType: NorrisWriterCodexEntryType.Character,
			title: 'Hero',
			body: '',
		});
		const entryB = await db.createEntry({
			storyId: storyB.id,
			entryType: NorrisWriterCodexEntryType.Character,
			title: 'Other Hero',
			body: '',
		});

		await assert.rejects(() => db.createRelationship({
			storyId: storyA.id,
			fromEntryId: entryA.id,
			toEntryId: entryB.id,
			relationshipType: 'knows',
		}));
	});

	test('pen name delete restricted when stories exist', async () => {
		const penName = await db.createPenName({ name: 'Protected' });
		await db.createStory({ penNameId: penName.id, title: 'Child Story' });

		await assert.rejects(() => db.deletePenName(penName.id));
	});
});
