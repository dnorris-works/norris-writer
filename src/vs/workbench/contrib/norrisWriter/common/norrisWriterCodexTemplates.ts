/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const CODEX_ENTRY_TEMPLATE = `---
title: Entry Title
type: character
aliases: []
aiContext: when-detected
enabled: true
---

Describe what the AI should know about this entry.
`;

export const CODEX_SERIES_BIBLE_TEMPLATE = `---
title: Series Bible
type: lore
aliases: [world bible, bible]
aiContext: always
enabled: true
---

Core world rules, timeline, themes, and continuity notes the AI should always respect.
`;

export const CODEX_CHARACTER_TEMPLATE = (name: string) => `---
title: ${name}
type: character
aliases: []
aiContext: when-detected
enabled: true
---

Role, voice, goals, relationships, and anything the AI must keep consistent.
`;

export function slugifyCodexTitle(title: string): string {
	return title
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'entry';
}
