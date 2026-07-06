/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Range } from '../../../../editor/common/core/range.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { REOPEN_ACTIVE_EDITOR_WITH_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { getCodeEditor, ICodeEditor } from '../../../../editor/browser/editorBrowser.js';

const MARKDOWN_LANG = ContextKeyExpr.equals('resourceLangId', 'markdown');
const MARKDOWN_TEXT_EDITOR = ContextKeyExpr.and(
	MARKDOWN_LANG,
	ContextKeyExpr.equals('activeEditor', 'workbench.editors.files.textFileEditor'),
);
const MARKDOWN_ANY = ContextKeyExpr.or(MARKDOWN_LANG, ContextKeyExpr.equals('activeCustomEditorId', 'vscode.markdown.editor'), ContextKeyExpr.equals('activeCustomEditorId', 'vscode.markdown.preview.editor'));

export const NORRIS_MARKDOWN_WRITING_VIEW_COMMAND_ID = 'norrisWriter.openMarkdownWritingView';
export const NORRIS_MARKDOWN_PREVIEW_COMMAND_ID = 'norrisWriter.openMarkdownPreview';
export const NORRIS_MARKDOWN_SOURCE_COMMAND_ID = 'norrisWriter.openMarkdownSource';

function applyLinePrefix(editor: ICodeEditor, prefix: string): void {
	const model = editor.getModel();
	if (!model) {
		return;
	}

	editor.pushUndoStop();
	editor.executeEdits('norrisWriter.markdown.format', editor.getSelections()?.flatMap(selection => {
		const edits = [];
		for (let lineNumber = selection.startLineNumber; lineNumber <= selection.endLineNumber; lineNumber++) {
			const line = model.getLineContent(lineNumber);
			const stripped = line.replace(/^#{1,6}\s+/, '');
			edits.push({
				range: new Range(lineNumber, 1, lineNumber, line.length + 1),
				text: prefix + stripped,
				forceMoveMarkers: true,
			});
		}
		return edits;
	}) ?? []);
	editor.pushUndoStop();
}

function wrapSelectionMarkers(editor: ICodeEditor, before: string, after: string): void {
	const model = editor.getModel();
	if (!model) {
		return;
	}

	editor.pushUndoStop();
	editor.executeEdits('norrisWriter.markdown.format', editor.getSelections()?.map(selection => {
		if (selection.isEmpty()) {
			return {
				range: selection,
				text: before + after,
				forceMoveMarkers: true,
			};
		}
		return {
			range: selection,
			text: before + model.getValueInRange(selection) + after,
			forceMoveMarkers: true,
		};
	}) ?? []);
	editor.pushUndoStop();
}

function runTextEditorFormat(accessor: ServicesAccessor, apply: (editor: ICodeEditor) => void): void {
	const editor = getCodeEditor(accessor.get(IEditorService).activeTextEditorControl);
	if (!editor) {
		return;
	}
	apply(editor);
}

function registerHeadingAction(level: number, id: string, label: string): void {
	registerAction2(class extends Action2 {
		constructor() {
			super({
				id,
				title: localize2(`norrisWriter.markdown.heading${level}`, label),
				category: localize2('norrisWriter.category', 'Norris Writer'),
				precondition: MARKDOWN_TEXT_EDITOR,
				menu: [{
					id: MenuId.EditorTitle,
					group: 'norrisWriterMarkdown',
					order: level,
					when: MARKDOWN_TEXT_EDITOR,
				}],
			});
		}

		run(accessor: ServicesAccessor): void {
			runTextEditorFormat(accessor, editor => applyLinePrefix(editor, '#'.repeat(level) + ' '));
		}
	});
}

registerAction2(class NorrisMarkdownWritingViewAction extends Action2 {
	constructor() {
		super({
			id: NORRIS_MARKDOWN_WRITING_VIEW_COMMAND_ID,
			title: localize2('norrisWriter.openMarkdownWritingView', 'Writing View'),
			tooltip: localize('norrisWriter.openMarkdownWritingView.tooltip', 'Edit in rendered writing view'),
			icon: { id: 'book' },
			category: localize2('norrisWriter.category', 'Norris Writer'),
			f1: true,
			precondition: ContextKeyExpr.and(MARKDOWN_ANY, ContextKeyExpr.notEquals('activeCustomEditorId', 'vscode.markdown.editor')),
			menu: [{
				id: MenuId.EditorTitle,
				group: 'navigation@0',
				order: 0,
				when: ContextKeyExpr.and(MARKDOWN_ANY, ContextKeyExpr.notEquals('activeCustomEditorId', 'vscode.markdown.editor')),
			}],
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(ICommandService).executeCommand(REOPEN_ACTIVE_EDITOR_WITH_COMMAND_ID, 'vscode.markdown.editor');
	}
});

registerAction2(class NorrisMarkdownPreviewAction extends Action2 {
	constructor() {
		super({
			id: NORRIS_MARKDOWN_PREVIEW_COMMAND_ID,
			title: localize2('norrisWriter.openMarkdownPreview', 'Preview'),
			tooltip: localize('norrisWriter.openMarkdownPreview.tooltip', 'Read-only preview'),
			icon: { id: 'open-preview' },
			category: localize2('norrisWriter.category', 'Norris Writer'),
			f1: true,
			precondition: ContextKeyExpr.and(MARKDOWN_ANY, ContextKeyExpr.notEquals('activeCustomEditorId', 'vscode.markdown.preview.editor')),
			menu: [{
				id: MenuId.EditorTitle,
				group: 'navigation@0',
				order: 1,
				when: ContextKeyExpr.and(MARKDOWN_ANY, ContextKeyExpr.notEquals('activeCustomEditorId', 'vscode.markdown.preview.editor')),
			}],
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(ICommandService).executeCommand(REOPEN_ACTIVE_EDITOR_WITH_COMMAND_ID, 'vscode.markdown.preview.editor');
	}
});

registerAction2(class NorrisMarkdownSourceAction extends Action2 {
	constructor() {
		super({
			id: NORRIS_MARKDOWN_SOURCE_COMMAND_ID,
			title: localize2('norrisWriter.openMarkdownSource', 'Source'),
			tooltip: localize('norrisWriter.openMarkdownSource.tooltip', 'Edit raw Markdown'),
			icon: { id: 'file-code' },
			category: localize2('norrisWriter.category', 'Norris Writer'),
			f1: true,
			precondition: ContextKeyExpr.and(MARKDOWN_ANY, ContextKeyExpr.notEquals('activeEditor', 'workbench.editors.files.textFileEditor')),
			menu: [{
				id: MenuId.EditorTitle,
				group: 'navigation@0',
				order: 2,
				when: ContextKeyExpr.and(MARKDOWN_ANY, ContextKeyExpr.notEquals('activeEditor', 'workbench.editors.files.textFileEditor')),
			}],
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(ICommandService).executeCommand(REOPEN_ACTIVE_EDITOR_WITH_COMMAND_ID, 'default');
	}
});

registerHeadingAction(1, 'norrisWriter.markdown.heading1', 'Heading 1');
registerHeadingAction(2, 'norrisWriter.markdown.heading2', 'Heading 2');
registerHeadingAction(3, 'norrisWriter.markdown.heading3', 'Heading 3');
registerHeadingAction(4, 'norrisWriter.markdown.heading4', 'Heading 4');
registerHeadingAction(5, 'norrisWriter.markdown.heading5', 'Heading 5');
registerHeadingAction(6, 'norrisWriter.markdown.heading6', 'Heading 6');

registerAction2(class NorrisMarkdownBoldAction extends Action2 {
	constructor() {
		super({
			id: 'norrisWriter.markdown.bold',
			title: localize2('norrisWriter.markdown.bold', 'Bold'),
			icon: { id: 'bold' },
			category: localize2('norrisWriter.category', 'Norris Writer'),
			precondition: MARKDOWN_TEXT_EDITOR,
			menu: [{ id: MenuId.EditorTitle, group: 'norrisWriterMarkdown', order: 10, when: MARKDOWN_TEXT_EDITOR }],
		});
	}

	run(accessor: ServicesAccessor): void {
		runTextEditorFormat(accessor, editor => wrapSelectionMarkers(editor, '**', '**'));
	}
});

registerAction2(class NorrisMarkdownItalicAction extends Action2 {
	constructor() {
		super({
			id: 'norrisWriter.markdown.italic',
			title: localize2('norrisWriter.markdown.italic', 'Italic'),
			icon: { id: 'italic' },
			category: localize2('norrisWriter.category', 'Norris Writer'),
			precondition: MARKDOWN_TEXT_EDITOR,
			menu: [{ id: MenuId.EditorTitle, group: 'norrisWriterMarkdown', order: 11, when: MARKDOWN_TEXT_EDITOR }],
		});
	}

	run(accessor: ServicesAccessor): void {
		runTextEditorFormat(accessor, editor => wrapSelectionMarkers(editor, '*', '*'));
	}
});
