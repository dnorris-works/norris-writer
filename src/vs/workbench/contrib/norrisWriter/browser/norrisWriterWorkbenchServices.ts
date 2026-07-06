/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Norris Writer disables the Copilot SDK agent-host process but chat UI still
 * depends on IAgentHostService (input chrome, config chips, etc.). Register null
 * implementations so those components can instantiate without starting agent host.
 */

import { Event } from '../../../../base/common/event.js';
import { IReference } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { NullAgentHostService } from '../../../../platform/agentHost/browser/nullAgentHostService.js';
import { IAgentHostService } from '../../../../platform/agentHost/common/agentService.js';
import { IRemoteAgentHostService, NullRemoteAgentHostService } from '../../../../platform/agentHost/common/remoteAgentHostService.js';
import type { IAgentSubscription } from '../../../../platform/agentHost/common/state/agentSubscription.js';
import type { ComponentToState, RootState, StateComponents } from '../../../../platform/agentHost/common/state/sessionState.js';

const noopAgentHostSubscription = {
	value: undefined,
	verifiedValue: undefined,
	onDidChange: Event.None,
	onWillApplyAction: Event.None,
	onDidApplyAction: Event.None,
} satisfies IAgentSubscription<unknown>;

class NorrisWriterAgentHostService extends NullAgentHostService {

	override get rootState(): IAgentSubscription<RootState> {
		return noopAgentHostSubscription as IAgentSubscription<RootState>;
	}

	override getSubscription<T extends StateComponents>(_kind: T, _resource: URI, _owner: string): IReference<IAgentSubscription<ComponentToState[T]>> {
		return {
			object: noopAgentHostSubscription as IAgentSubscription<ComponentToState[T]>,
			dispose: () => { },
		};
	}
}

registerSingleton(IAgentHostService, NorrisWriterAgentHostService, InstantiationType.Eager);
registerSingleton(IRemoteAgentHostService, NullRemoteAgentHostService, InstantiationType.Eager);

// Composes ambient + remote agent-host connections for chat customization UI.
import '../../../../platform/agentHost/browser/agentHostConnectionsService.js';
