import { getEmojiSequenceFromString, getUnqualifiedEmojiSequence } from "../cleanup.js";
import { getEmojiSequenceKeyword } from "../format.js";

const componentStatus = "component";
const allowedStatus = new Set([
	componentStatus,
	"fully-qualified",
	"minimally-qualified",
	"unqualified"
]);
/**
* Get qualified variations from parsed test file
*
* Key is unqualified emoji, value is longest fully qualified emoji
*/
function getQualifiedTestData(data) {
	const results = Object.create(null);
	for (const key in data) {
		const item = data[key];
		const sequence = getUnqualifiedEmojiSequence(item.sequence);
		const shortKey = getEmojiSequenceKeyword(sequence);
		if (!results[shortKey] || results[shortKey].sequence.length < sequence.length) results[shortKey] = item;
	}
	return results;
}
/**
* Get all emoji sequences from test file
*
* Returns all emojis as UTF-32 sequences, where:
* 	key = unqualified sequence (without \uFE0F)
* 	value = qualified sequence (with \uFE0F)
*
* Duplicate items that have different versions with and without \uFE0F are
* listed only once, with unqualified sequence as key and longest possible
* qualified sequence as value
*
* Example of 3 identical entries:
*  '1F441 FE0F 200D 1F5E8 FE0F'
*  '1F441 200D 1F5E8 FE0F'
*  '1F441 FE0F 200D 1F5E8'
* 	'1F441 200D 1F5E8'
*
* Out of these entries, only one item will be returned with:
* 	key = '1f441-200d-1f5e8' (converted to lower case, separated with dash)
* 	value.sequence = [0x1F441, 0xFE0F, 0x200D, 0x1F5E8, 0xFE0F]
* 	value.status = 'fully-qualified'
* 	other properties in value are identical for all versions
*/
function parseEmojiTestFile(data) {
	const results = Object.create(null);
	let group;
	let subgroup;
	data.split("\n").forEach((line) => {
		line = line.trim();
		const parts = line.split("#");
		if (parts.length < 2) return;
		const firstChunk = parts.shift().trim();
		const secondChunk = parts.join("#").trim();
		if (!firstChunk) {
			const commentParts = secondChunk.split(":");
			if (commentParts.length === 2) {
				const key$1 = commentParts[0].trim();
				const value = commentParts[1].trim();
				switch (key$1) {
					case "group":
						group = value;
						subgroup = void 0;
						break;
					case "subgroup":
						subgroup = value;
						break;
				}
			}
			return;
		}
		if (!group || !subgroup) return;
		const firstChunkParts = firstChunk.split(";");
		if (firstChunkParts.length !== 2) return;
		const code = firstChunkParts[0].trim();
		if (!code || !code.match(/^[A-F0-9]+[A-F0-9\s]*[A-F0-9]+$/)) return;
		const status = firstChunkParts[1].trim();
		if (!allowedStatus.has(status)) throw new Error(`Bad emoji type: ${status}`);
		const secondChunkParts = secondChunk.split(/\s+/);
		if (secondChunkParts.length < 3) throw new Error(`Bad emoji comment for: ${code}`);
		const emoji = secondChunkParts.shift();
		const version = secondChunkParts.shift();
		if (version.slice(0, 1) !== "E") throw new Error(`Bad unicode version "${version}" for: ${code}`);
		const name = secondChunkParts.join(" ");
		const sequence = getEmojiSequenceFromString(code);
		const key = getEmojiSequenceKeyword(sequence);
		if (results[key]) throw new Error(`Duplicate entry for "${code}"`);
		results[key] = {
			group,
			subgroup,
			sequence,
			emoji,
			status,
			version,
			name
		};
	});
	return getQualifiedTestData(results);
}

export { componentStatus, parseEmojiTestFile };