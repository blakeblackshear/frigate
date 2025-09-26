'use strict';
const emojiModifierBase = require('unicode-emoji-modifier-base');

const skinTones = new Map([
	['none', ''],
	['white', '🏻'],
	['creamWhite', '🏼'],
	['lightBrown', '🏽'],
	['brown', '🏾'],
	['darkBrown', '🏿']
]);

module.exports = (emoji, tone) => {
	if (!skinTones.has(tone)) {
		throw new TypeError(`Unexpected \`skinTone\` name: ${tone}`);
	}

	emoji = emoji.replace(/[\u{1f3fb}-\u{1f3ff}]/u, '');

	if (emojiModifierBase.has(emoji.codePointAt(0)) && tone !== 'none') {
		emoji += skinTones.get(tone);
	}

	return emoji;
};
