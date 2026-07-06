/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const enum NorrisWriterEditorAppearance {
	FollowTheme = 'followTheme',
	Paper = 'paper',
}

export const NorrisWriterEditorAppearanceSetting = 'norrisWriter.editor.appearance';

export const NORRIS_WRITER_PAPER_EDITOR_CLASS = 'norris-paper-editor';

/** Legacy keys written to workbench.colorCustomizations — stripped on startup. */
export const NORRIS_WRITER_LEGACY_PAPER_COLOR_KEYS: readonly string[] = [
	'editor.background',
	'editor.foreground',
	'editorLineNumber.foreground',
	'editor.lineHighlightBackground',
	'editor.selectionBackground',
	'editor.inactiveSelectionBackground',
	'editorCursor.foreground',
	'editorWidget.background',
];

export const NORRIS_WRITER_LEGACY_PAPER_COLOR_VALUES: Readonly<Record<string, string>> = {
	'editor.background': '#FAF8F5',
	'editor.foreground': '#000000',
	'editorLineNumber.foreground': '#8A8278',
	'editor.lineHighlightBackground': '#F3EDE3',
	'editor.selectionBackground': '#E5D9C8',
	'editor.inactiveSelectionBackground': '#EDE4D6',
	'editorCursor.foreground': '#000000',
	'editorWidget.background': '#FAF8F5',
};

export function isNorrisWriterPaperAppearance(value: unknown): boolean {
	return value === NorrisWriterEditorAppearance.Paper;
}

export function isNorrisWriterPaperLanguage(languageId: string | undefined): boolean {
	return languageId === 'markdown';
}
