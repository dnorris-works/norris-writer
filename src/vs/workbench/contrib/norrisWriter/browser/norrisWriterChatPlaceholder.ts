/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { IChatAgentHistoryEntry, IChatAgentImplementation, IChatAgentRequest, IChatAgentResult, IChatAgentService } from '../../chat/common/participants/chatAgents.js';
import { ChatAgentLocation, ChatModeKind } from '../../chat/common/constants.js';
import { IChatProgress } from '../../chat/common/chatService/chatService.js';

const NORRIS_WRITER_AGENT_ID = 'norris.writer.assistant';
const NORRIS_WRITER_EXTENSION_ID = new ExtensionIdentifier('norris.writer');

class NorrisWriterChatPlaceholderAgent implements IChatAgentImplementation {
	async invoke(request: IChatAgentRequest, progress: (parts: IChatProgress[]) => void, _history: IChatAgentHistoryEntry[], _token: CancellationToken): Promise<IChatAgentResult> {
		progress([{
			kind: 'markdownContent',
			content: new MarkdownString(
				localize(
					'norrisWriter.chatPlaceholder.response',
					"Norris Writer AI is not connected yet.\n\nThe chat panel is ready — a future update will plug in your own API key (for example OpenRouter) through the built-in language model service, without GitHub Copilot."
				),
				{ isTrusted: false }
			)
		}]);
		return {};
	}
}

class NorrisWriterChatPlaceholderContribution extends Disposable implements IWorkbenchContribution {

	constructor(
		@IChatAgentService chatAgentService: IChatAgentService,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		const agent = instantiationService.createInstance(NorrisWriterChatPlaceholderAgent);
		this._register(chatAgentService.registerAgent(NORRIS_WRITER_AGENT_ID, {
			id: NORRIS_WRITER_AGENT_ID,
			name: 'assistant',
			fullName: localize2('norrisWriter.chatAgent.fullName', 'Writing Assistant').value,
			description: localize2('norrisWriter.chatAgent.description', 'Norris Writer AI (coming soon)').value,
			extensionId: NORRIS_WRITER_EXTENSION_ID,
			extensionVersion: undefined,
			extensionPublisherId: 'norris',
			extensionDisplayName: 'Norris Writer',
			publisherDisplayName: 'Norris Writer',
			isDefault: true,
			isCore: true,
			isDynamic: true,
			metadata: {},
			slashCommands: [],
			locations: [ChatAgentLocation.Chat],
			modes: [ChatModeKind.Ask],
			disambiguation: [],
		}));
		this._register(chatAgentService.registerAgentImplementation(NORRIS_WRITER_AGENT_ID, agent));
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(NorrisWriterChatPlaceholderContribution, LifecyclePhase.Eventually);
