/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const enum NorrisWriterEditorAppearance {
	FollowTheme = 'followTheme',
	Paper = 'paper',
}

export const NorrisWriterEditorAppearanceSetting = 'norrisWriter.editor.appearance';

/** Warm cream page with black ink — used when appearance is `paper`. */
export const NORRIS_WRITER_PAPER_EDITOR_COLORS: Readonly<Record<string, string>> = {
	'editor.background': '#FAF8F5',
	'editor.foreground': '#000000',
	'editorLineNumber.foreground': '#8A8278',
	'editor.lineHighlightBackground': '#F3EDE3',
	'editor.selectionBackground': '#E5D9C8',
	'editor.inactiveSelectionBackground': '#EDE4D6',
	'editorCursor.foreground': '#000000',
	'editorWidget.background': '#FAF8F5',
};

export const NORRIS_WRITER_PAPER_CSS_VARIABLES: Readonly<Record<string, string>> = {
	'--vscode-editor-background': '#FAF8F5',
	'--vscode-editor-foreground': '#000000',
	'--vscode-foreground': '#000000',
};
