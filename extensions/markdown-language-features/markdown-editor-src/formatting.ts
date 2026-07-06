/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorModel, OffsetRange, StringEdit, findNodeOffsetById } from '@vscode/markdown-editor';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export function setHeadingLevel(model: EditorModel, level: HeadingLevel): void {
	const activeBlock = model.activeBlock.get();
	if (!activeBlock) {
		return;
	}

	const doc = model.document.get();
	const blockOffset = findNodeOffsetById(doc, activeBlock);
	if (blockOffset === undefined) {
		return;
	}

	const source = model.sourceText.get().value;
	const blockText = source.substring(blockOffset, blockOffset + activeBlock.length);
	const body = blockText.replace(/^#{1,6}\s+/, '');
	const prefix = '#'.repeat(level) + ' ';
	const newBlockText = prefix + body;

	model.applyEdit(StringEdit.replace(
		OffsetRange.fromTo(blockOffset, blockOffset + activeBlock.length),
		newBlockText,
	));
}

export function wrapSelection(model: EditorModel, before: string, after: string): void {
	const selection = model.selection.get();
	if (!selection) {
		return;
	}

	const range = selection.range;
	if (range.isEmpty) {
		model.applyEdit(StringEdit.insert(range.start, before + after));
		return;
	}

	const source = model.sourceText.get().value;
	const selected = source.substring(range.start, range.endExclusive);
	model.applyEdit(StringEdit.replace(range, before + selected + after));
}
