/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerWorkbenchContribution2, WorkbenchPhase, IWorkbenchContribution } from '../../../common/contributions.js';
import { IChatEntitlementService } from '../../../services/chat/common/chatEntitlementService.js';
import { HasByokModelsContribution } from '../../chat/browser/hasByokModelsContribution.js';
import { chatViewsWelcomeRegistry } from '../../chat/browser/viewsWelcome/chatViewsWelcome.js';
import { ChatContextKeys } from '../../chat/common/actions/chatContextKeys.js';
import { ILanguageModelsService } from '../../chat/common/languageModels.js';
import { NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID, TokenMixConfiguration } from '../common/tokenMixConstants.js';
import { ITokenMixCredentialService } from './tokenMixCredentialService.js';

// Copilot setup was removed from Norris Writer; this contribution is still required
// so TokenMix counts as BYOK and chat UI unlocks.
registerWorkbenchContribution2(HasByokModelsContribution.ID, HasByokModelsContribution, WorkbenchPhase.BlockStartup);

chatViewsWelcomeRegistry.register({
	icon: Codicon.book,
	title: localize('norrisWriter.chatWelcome.title', 'Writing Assistant'),
	content: new MarkdownString(localize(
		'norrisWriter.chatWelcome.message',
		'Brainstorm, draft, and revise your manuscript with TokenMix.\n\n[Configure TokenMix](command:{0})',
		NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID,
	), { isTrusted: { enabledCommands: [NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID] } }),
	when: ContextKeyExpr.and(
		ChatContextKeys.panelParticipantRegistered,
		ChatContextKeys.Setup.hidden.negate()!,
	)!,
});

class NorrisWriterChatBootstrapContribution extends Disposable implements IWorkbenchContribution {

	constructor(
		@IChatEntitlementService private readonly chatEntitlementService: IChatEntitlementService,
		@ITokenMixCredentialService private readonly credentialService: ITokenMixCredentialService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILanguageModelsService private readonly languageModelsService: ILanguageModelsService,
	) {
		super();

		const bootstrap = () => { this._bootstrap(); };
		this._register(this.credentialService.onDidChange(bootstrap));
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(TokenMixConfiguration.Enabled)
				|| e.affectsConfiguration(TokenMixConfiguration.ApiKey)) {
				bootstrap();
			}
		}));
		this._register(this.languageModelsService.onDidChangeLanguageModelVendors(bootstrap));
		bootstrap();
	}

	private _bootstrap(): void {
		if (!this.configurationService.getValue<boolean>(TokenMixConfiguration.Enabled)) {
			return;
		}

		// Unlock chat UI that waits for "setup completed" or BYOK.
		this.chatEntitlementService.markSetupCompleted();
	}
}

registerWorkbenchContribution2('norrisWriter.chatBootstrap', NorrisWriterChatBootstrapContribution, WorkbenchPhase.AfterRestored);
