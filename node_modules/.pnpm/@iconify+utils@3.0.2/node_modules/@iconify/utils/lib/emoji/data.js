/**
* Various codes
*/
const joinerEmoji = 8205;
const vs16Emoji = 65039;
const keycapEmoji = 8419;
const emojiComponents = {
	"hair-style": [129456, 129460],
	"skin-tone": [127995, 128e3]
};
/**
* Minimum UTF-32 number
*/
const minUTF32 = 65536;
/**
* Codes for UTF-32 characters presented as UTF-16
*
* startUTF32Pair1 <= code < startUTF32Pair2 -> code for first character in pair
* startUTF32Pair2 <= code < endUTF32Pair -> code for second character in pair
*/
const startUTF32Pair1 = 55296;
const startUTF32Pair2 = 56320;
const endUTF32Pair = 57344;
/**
* Emoji version as string
*/
const emojiVersion = "17.0";

export { emojiComponents, emojiVersion, endUTF32Pair, joinerEmoji, keycapEmoji, minUTF32, startUTF32Pair1, startUTF32Pair2, vs16Emoji };