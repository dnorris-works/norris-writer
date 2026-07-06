/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStatusbarEntry, IStatusbarEntryAccessor, IStatusbarService, StatusbarAlignment } from '../../../services/statusbar/browser/statusbar.js';
import { Extensions as WorkbenchExtensions, IWorkbenchContributionsRegistry } from '../../../common/contributions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { getCodeEditor, ICodeEditor } from '../../../../editor/browser/editorBrowser.js';

const WORD_COUNT_CONFIG = 'norrisWriter.wordCount.enabled';

function countWords(text: string): number {
	const trimmed = text.trim();
	if (!trimmed) {
		return 0;
	}
	return trimmed.split(/\s+/).length;
}

class NorrisWriterWordCountContribution extends Disposable {
	private readonly entry = this._register(new MutableDisposable<IStatusbarEntryAccessor>());
	private readonly editorListener = this._register(new MutableDisposable());

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@IStatusbarService private readonly statusbarService: IStatusbarService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super();
		this._register(this.editorService.onDidActiveEditorChange(() => this.update()));
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(WORD_COUNT_CONFIG)) {
				this.update();
			}
		}));
		this.update();
	}

	private update(): void {
		this.editorListener.clear();

		if (!this.configurationService.getValue<boolean>(WORD_COUNT_CONFIG)) {
			this.entry.clear();
			return;
		}

		const editor = getCodeEditor(this.editorService.activeTextEditorControl);
		if (!editor) {
			this.entry.clear();
			return;
		}

		const render = (editorInstance: ICodeEditor) => {
			const words = countWords(editorInstance.getModel()?.getValue() ?? '');
			const entry: IStatusbarEntry = {
				name: localize('norrisWriter.wordCount', "Word Count"),
				text: localize('norrisWriter.wordCountText', "{0} words", words),
				ariaLabel: localize('norrisWriter.wordCountAria', "{0} words in the active document", words),
				tooltip: localize('norrisWriter.wordCountTooltip', "Word count for the active document"),
			};
			if (!this.entry.value) {
				this.entry.value = this.statusbarService.addEntry(entry, 'norrisWriter.wordCount', StatusbarAlignment.RIGHT, 50);
			} else {
				this.entry.value.update(entry);
			}
		};

		render(editor);
		this.editorListener.value = editor.onDidChangeModelContent(() => render(editor));
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(NorrisWriterWordCountContribution, LifecyclePhase.Restored);
