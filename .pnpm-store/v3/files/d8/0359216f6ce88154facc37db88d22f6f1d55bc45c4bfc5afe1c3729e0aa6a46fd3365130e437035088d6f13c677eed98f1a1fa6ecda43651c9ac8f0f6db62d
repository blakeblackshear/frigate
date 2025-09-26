# crypto-random-string

> Generate a [cryptographically strong](https://en.wikipedia.org/wiki/Strong_cryptography) random string

Can be useful for creating an identifier, slug, salt, PIN code, fixture, etc.

## Install

```
$ npm install crypto-random-string
```

## Usage

```js
import cryptoRandomString from 'crypto-random-string';

cryptoRandomString({length: 10});
//=> '2cf05d94db'

cryptoRandomString({length: 10, type: 'base64'});
//=> 'YMiMbaQl6I'

cryptoRandomString({length: 10, type: 'url-safe'});
//=> 'YN-tqc8pOw'

cryptoRandomString({length: 10, type: 'numeric'});
//=> '8314659141'

cryptoRandomString({length: 6, type: 'distinguishable'});
//=> 'CDEHKM'

cryptoRandomString({length: 10, type: 'ascii-printable'});
//=> '`#Rt8$IK>B'

cryptoRandomString({length: 10, type: 'alphanumeric'});
//=> 'DMuKL8YtE7'

cryptoRandomString({length: 10, characters: 'abc'});
//=> 'abaaccabac'
```

## API

### cryptoRandomString(options)

Returns a randomized string. [Hex](https://en.wikipedia.org/wiki/Hexadecimal) by default.

### cryptoRandomString.async(options)

Returns a promise which resolves to a randomized string. [Hex](https://en.wikipedia.org/wiki/Hexadecimal) by default.

For most use-cases, there's really no good reason to use this async version. From the Node.js docs:

> The `crypto.randomBytes()` method will not complete until there is sufficient entropy available. This should normally never take longer than a few milliseconds. The only time when generating the random bytes may conceivably block for a longer period of time is right after boot, when the whole system is still low on entropy.

In general, anything async comes with some overhead on it's own.

#### options

Type: `object`

##### length

*Required*\
Type: `number`

Length of the returned string.

##### type

Type: `string`\
Default: `'hex'`\
Values: `'hex' | 'base64' | 'url-safe' | 'numeric' | 'distinguishable' | 'ascii-printable' | 'alphanumeric'`

Use only characters from a predefined set of allowed characters.

Cannot be set at the same time as the `characters` option.

The `distinguishable` set contains only uppercase characters that are not easily confused: `CDEHKMPRTUWXY012458`. It can be useful if you need to print out a short string that you'd like users to read and type back in with minimal errors. For example, reading a code off of a screen that needs to be typed into a phone to connect two devices.

The `ascii-printable` set contains all [printable ASCII characters](https://en.wikipedia.org/wiki/ASCII#ASCII_printable_characters): ``!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~`` Useful for generating passwords where all possible ASCII characters should be used.

The `alphanumeric` set contains uppercase letters, lowercase letters, and digits: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`. Useful for generating [nonce](https://developer.mozilla.org/en-US/docs/Web/API/HTMLOrForeignElement/nonce) values.

##### characters

Type: `string`\
Minimum length: `1`\
Maximum length: `65536`

Use only characters from a custom set of allowed characters.

Cannot be set at the same time as the `type` option.

## Related

- [random-int](https://github.com/sindresorhus/random-int) - Generate a random integer
- [random-float](https://github.com/sindresorhus/random-float) - Generate a random float
- [random-item](https://github.com/sindresorhus/random-item) - Get a random item from an array
- [random-boolean](https://github.com/arthurvr/random-boolean) - Get a random boolean
- [random-obj-key](https://github.com/sindresorhus/random-obj-key) - Get a random key from an object
- [random-obj-prop](https://github.com/sindresorhus/random-obj-prop) - Get a random property from an object
- [unique-random](https://github.com/sindresorhus/unique-random) - Generate random numbers that are consecutively unique

---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-crypto-random-string?utm_source=npm-crypto-random-string&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
