/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IExtensionHostDebugService, IOpenExtensionWindowResult } from '../../../../platform/debug/common/extensionHostDebug.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';

/**
 * Norris Writer: extension-host debug IPC is disabled. This stub satisfies
 * {@link IExtensionHostDebugService} so the extension host can start without
 * registering the main-process debug channel.
 */
class NoOpExtensionHostDebugService implements IExtensionHostDebugService {
	declare readonly _serviceBrand: undefined;

	readonly onReload = Event.None;
	readonly onClose = Event.None;
	readonly onAttachSession = Event.None;
	readonly onTerminateSession = Event.None;

	reload(_sessionId: string): void { }
	close(_sessionId: string): void { }
	attachSession(_sessionId: string, _port: number, _subId?: string): void { }
	terminateSession(_sessionId: string, _subId?: string): void { }

	openExtensionDevelopmentHostWindow(_args: string[], _debugRenderer: boolean): Promise<IOpenExtensionWindowResult> {
		return Promise.resolve({ success: false });
	}

	attachToCurrentWindowRenderer(_windowId: number): Promise<IOpenExtensionWindowResult> {
		return Promise.resolve({ success: false });
	}
}

registerSingleton(IExtensionHostDebugService, NoOpExtensionHostDebugService, InstantiationType.Delayed);
