/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/norrisWriterPaperEditor.css';

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorContributionInstantiation, registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { IEditorContribution } from '../../../../editor/common/editorCommon.js';
import { ConfigurationTarget, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import {
	isNorrisWriterPaperAppearance,
	isNorrisWriterPaperLanguage,
	NORRIS_WRITER_LEGACY_PAPER_COLOR_KEYS,
	NORRIS_WRITER_LEGACY_PAPER_COLOR_VALUES,
	NORRIS_WRITER_PAPER_EDITOR_CLASS,
	NorrisWriterEditorAppearanceSetting,
} from '../common/editorAppearanceConstants.js';

const COLOR_CUSTOMIZATIONS_KEY = 'workbench.colorCustomizations';

function stripLegacyPaperColorCustomizations(existing: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
	if (!existing) {
		return undefined;
	}
	const next = { ...existing };
	let changed = false;
	for (const key of NORRIS_WRITER_LEGACY_PAPER_COLOR_KEYS) {
		if (next[key] === NORRIS_WRITER_LEGACY_PAPER_COLOR_VALUES[key]) {
			delete next[key];
			changed = true;
		}
	}
	return changed ? next : existing;
}

class NorrisWriterPaperEditorContribution extends Disposable implements IEditorContribution {

	static readonly ID = 'editor.contrib.norrisWriterPaper';

	constructor(
		private readonly editor: ICodeEditor,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super();
		this._apply();
		this._register(this.editor.onDidChangeModel(() => this._apply()));
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(NorrisWriterEditorAppearanceSetting)) {
				this._apply();
			}
		}));
	}

	private _apply(): void {
		const usePaper = isNorrisWriterPaperAppearance(this.configurationService.getValue(NorrisWriterEditorAppearanceSetting))
			&& isNorrisWriterPaperLanguage(this.editor.getModel()?.getLanguageId());
		this.editor.getContainerDomNode().classList.toggle(NORRIS_WRITER_PAPER_EDITOR_CLASS, usePaper);
	}
}

registerEditorContribution(
	NorrisWriterPaperEditorContribution.ID,
	NorrisWriterPaperEditorContribution,
	EditorContributionInstantiation.AfterFirstRender,
);

class NorrisWriterEditorAppearanceContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.norrisWriterEditorAppearance';

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super();
		this._stripLegacyGlobalColors();
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(NorrisWriterEditorAppearanceSetting)) {
				this._refreshVisibleEditors();
			}
		}));
	}

	private _stripLegacyGlobalColors(): void {
		const current = this.configurationService.getValue<Record<string, unknown>>(COLOR_CUSTOMIZATIONS_KEY);
		const next = stripLegacyPaperColorCustomizations(current);
		if (!next || next === current) {
			return;
		}
		this.configurationService.updateValue(COLOR_CUSTOMIZATIONS_KEY, next, ConfigurationTarget.USER);
	}

	private _refreshVisibleEditors(): void {
		for (const control of this.editorService.visibleTextEditorControls) {
			const editor = getCodeEditor(control);
			editor?.getContainerDomNode().classList.toggle(
				NORRIS_WRITER_PAPER_EDITOR_CLASS,
				isNorrisWriterPaperAppearance(this.configurationService.getValue(NorrisWriterEditorAppearanceSetting))
				&& isNorrisWriterPaperLanguage(editor.getModel()?.getLanguageId()),
			);
		}
	}
}

registerWorkbenchContribution2(
	NorrisWriterEditorAppearanceContribution.ID,
	NorrisWriterEditorAppearanceContribution,
	WorkbenchPhase.AfterRestored,
);
