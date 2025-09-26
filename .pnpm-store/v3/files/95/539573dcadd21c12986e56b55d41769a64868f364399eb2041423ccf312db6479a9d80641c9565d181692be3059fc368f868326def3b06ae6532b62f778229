import {MergeExclusive} from 'type-fest';

interface BaseOptions {
	/**
	Length of the returned string.
	*/
	length: number;
}

interface TypeOption {
	/**
	Use only characters from a predefined set of allowed characters.

	Cannot be set at the same time as the `characters` option.

	@default 'hex'

	The `distinguishable` set contains only uppercase characters that are not easily confused: `CDEHKMPRTUWXY012458`. It can be useful if you need to print out a short string that you'd like users to read and type back in with minimal errors. For example, reading a code off of a screen that needs to be typed into a phone to connect two devices.

	The `ascii-printable` set contains all [printable ASCII characters](https://en.wikipedia.org/wiki/ASCII#ASCII_printable_characters): ``!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~`` Useful for generating passwords where all possible ASCII characters should be used.

	The `alphanumeric` set contains uppercase letters, lowercase letters, and digits: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`. Useful for generating [nonce](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOrForeignElement/nonce) values.

	@example
	```
	cryptoRandomString({length: 10});
	//=> '87fc70e2b9'

	cryptoRandomString({length: 10, type: 'base64'});
	//=> 'mhsX7xmIv/'

	cryptoRandomString({length: 10, type: 'url-safe'});
	//=> 'VEjfNW3Yej'

	cryptoRandomString({length: 10, type: 'numeric'});
	//=> '8314659141'

	cryptoRandomString({length: 6, type: 'distinguishable'});
	//=> 'CDEHKM'

	cryptoRandomString({length: 10, type: 'ascii-printable'});
	//=> '`#Rt8$IK>B'

	cryptoRandomString({length: 10, type: 'alphanumeric'});
	//=> 'DMuKL8YtE7'
	```
	*/
	type?: 'hex' | 'base64' | 'url-safe' | 'numeric' | 'distinguishable' | 'ascii-printable' | 'alphanumeric';
}

interface CharactersOption {
	/**
	Use only characters from a custom set of allowed characters.

	Cannot be set at the same time as the `type` option.

	Minimum length: `1`
	Maximum length: `65536`

	@example
	```
	cryptoRandomString({length: 10, characters: '0123456789'});
	//=> '8796225811'
	```
	*/
	characters?: string;
}

export type Options = BaseOptions & MergeExclusive<TypeOption, CharactersOption>;

declare const cryptoRandomString: {
	/**
	Generate a [cryptographically strong](https://en.wikipedia.org/wiki/Strong_cryptography) random string.

	@returns A randomized string.

	@example
	```
	import cryptoRandomString from 'crypto-random-string';

	cryptoRandomString({length: 10});
	//=> '2cf05d94db'
	```
	*/
	(options: Options): string;

	/**
	Asynchronously generate a [cryptographically strong](https://en.wikipedia.org/wiki/Strong_cryptography) random string.

	For most use-cases, there's really no good reason to use this async version. From the Node.js docs:

	> The `crypto.randomBytes()` method will not complete until there is sufficient entropy available. This should normally never take longer than a few milliseconds. The only time when generating the random bytes may conceivably block for a longer period of time is right after boot, when the whole system is still low on entropy.

	In general, anything async comes with some overhead on it's own.

	@returns A promise which resolves to a randomized string.

	@example
	```
	import cryptoRandomString from 'crypto-random-string';

	await cryptoRandomString.async({length: 10});
	//=> '2cf05d94db'
	```
	*/
	async(options: Options): Promise<string>;
};

export default cryptoRandomString;
