/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-browser/services.js';
import { CODEX_DATABASE_CHANNEL, ICodexDatabaseService } from '../common/codexDatabaseService.js';

registerMainProcessRemoteService(ICodexDatabaseService, CODEX_DATABASE_CHANNEL);
