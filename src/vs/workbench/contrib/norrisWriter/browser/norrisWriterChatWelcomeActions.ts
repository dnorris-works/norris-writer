/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID } from '../common/tokenMixConstants.js';
import { NORRIS_NEW_CODEX_ENTRY_COMMAND_ID, NORRIS_OPEN_CODEX_COMMAND_ID } from '../common/norrisWriterCodexConstants.js';

for (const [command, title, icon, order] of [
	[NORRIS_OPEN_CODEX_COMMAND_ID, localize2('norrisWriter.openCodex', 'Open Codex'), Codicon.book, 1],
	[NORRIS_NEW_CODEX_ENTRY_COMMAND_ID, localize2('norrisWriter.newCodexEntry', 'New Codex Entry...'), Codicon.add, 2],
	[NORRIS_CONFIGURE_TOKENMIX_COMMAND_ID, localize2('norrisWriter.configureTokenMix', 'Configure TokenMix...'), Codicon.key, 3],
] as const) {
	MenuRegistry.appendMenuItem(MenuId.ChatWelcomeContext, {
		command: { id: command, title, icon },
		group: 'norrisWriter',
		order,
	});
}
