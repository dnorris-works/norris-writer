/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Norris Writer disables the Copilot SDK agent-host process but chat UI still
 * depends on IAgentHostService (input chrome, config chips, etc.). Register null
 * implementations so those components can instantiate without starting agent host.
 */

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IReference } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstallPluginFromSourceOptions, IInstallPluginFromSourceResult, IPluginInstallService, IUpdateAllPluginsOptions, IUpdateAllPluginsResult } from '../../chat/common/plugins/pluginInstallService.js';
import { IMarketplacePlugin } from '../../chat/common/plugins/pluginMarketplaceService.js';
import { IDebugService } from '../../debug/common/debug.js';
import { NullDebugService, NullDebugVisualizerService } from '../../debug/common/nullDebugService.js';
import { IDebugVisualizerService } from '../../debug/common/debugVisualizers.js';
import { IOnboardingService } from '../../welcomeOnboarding/common/onboardingService.js';
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

class NorrisWriterNoOpOnboardingService implements IOnboardingService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidDismiss = new Emitter<void>();
	readonly onDidDismiss = this._onDidDismiss.event;

	show(): void { }
}

class NorrisWriterNoOpPluginInstallService implements IPluginInstallService {
	declare readonly _serviceBrand: undefined;

	installPlugin(_plugin: IMarketplacePlugin): Promise<void> {
		return Promise.resolve();
	}

	installPluginFromSource(_source: string, _options?: IInstallPluginFromSourceOptions): Promise<IInstallPluginFromSourceResult> {
		return Promise.resolve({ success: false, message: 'Plugin marketplace is disabled in Norris Writer.' });
	}

	validatePluginSource(_source: string): string | undefined {
		return undefined;
	}

	updatePlugin(_plugin: IMarketplacePlugin): Promise<boolean> {
		return Promise.resolve(false);
	}

	updateAllPlugins(_options: IUpdateAllPluginsOptions, _token: CancellationToken): Promise<IUpdateAllPluginsResult> {
		return Promise.resolve({ updatedNames: [], failedNames: [] });
	}

	getPluginInstallUri(_plugin: IMarketplacePlugin): URI {
		return URI.file('');
	}
}

registerSingleton(IOnboardingService, NorrisWriterNoOpOnboardingService, InstantiationType.Delayed);
registerSingleton(IPluginInstallService, NorrisWriterNoOpPluginInstallService, InstantiationType.Delayed);
// Debug UI is disabled; notebook and accessibility contributions still inject IDebugService.
registerSingleton(IDebugService, NullDebugService, InstantiationType.Delayed);
registerSingleton(IDebugVisualizerService, NullDebugVisualizerService, InstantiationType.Delayed);

// Composes ambient + remote agent-host connections for chat customization UI.
import '../../../../platform/agentHost/browser/agentHostConnectionsService.js';
