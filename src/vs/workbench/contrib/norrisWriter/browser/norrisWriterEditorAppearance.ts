/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ConfigurationTarget, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import {
	NORRIS_WRITER_PAPER_EDITOR_COLORS,
	NorrisWriterEditorAppearance,
	NorrisWriterEditorAppearanceSetting,
} from '../common/editorAppearanceConstants.js';

const COLOR_CUSTOMIZATIONS_KEY = 'workbench.colorCustomizations';

function isPaperAppearance(value: unknown): boolean {
	return value === NorrisWriterEditorAppearance.Paper;
}

function mergePaperColors(existing: Record<string, unknown> | undefined, enable: boolean): Record<string, unknown> {
	const base = { ...(existing ?? {}) };
	if (enable) {
		return { ...base, ...NORRIS_WRITER_PAPER_EDITOR_COLORS };
	}
	for (const key of Object.keys(NORRIS_WRITER_PAPER_EDITOR_COLORS)) {
		if (base[key] === NORRIS_WRITER_PAPER_EDITOR_COLORS[key]) {
			delete base[key];
		}
	}
	return base;
}

class NorrisWriterEditorAppearanceContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.norrisWriterEditorAppearance';

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super();
		this._apply(this.configurationService.getValue(NorrisWriterEditorAppearanceSetting));
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(NorrisWriterEditorAppearanceSetting)) {
				this._apply(this.configurationService.getValue(NorrisWriterEditorAppearanceSetting));
			}
		}));
	}

	private _apply(appearance: unknown): void {
		const enablePaper = isPaperAppearance(appearance);
		const current = this.configurationService.getValue<Record<string, unknown>>(COLOR_CUSTOMIZATIONS_KEY);
		const next = mergePaperColors(current, enablePaper);
		if (JSON.stringify(current ?? {}) === JSON.stringify(next)) {
			return;
		}
		this.configurationService.updateValue(COLOR_CUSTOMIZATIONS_KEY, next, ConfigurationTarget.USER);
	}
}

registerWorkbenchContribution2(
	NorrisWriterEditorAppearanceContribution.ID,
	NorrisWriterEditorAppearanceContribution,
	WorkbenchPhase.Restored,
);
