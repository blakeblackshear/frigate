# copy-text-to-clipboard

> Copy text to the clipboard in modern browsers *(0.2 kB)*

[Try it out!](https://jsfiddle.net/sindresorhus/6406v3pf/)

## Comparison

- This module: **0.2 kB**
- [`clipboard.js`](https://github.com/zenorocha/clipboard.js): 3.4 kB

## Install

```sh
npm install copy-text-to-clipboard
```

## Usage

```js
import copy from 'copy-text-to-clipboard';

button.addEventListener('click', () => {
	copy('🦄🌈');
});
```

## API

### copy(text, options?)

Copy `text` to the clipboard.

Returns a `boolean` of whether it succeeded to copy the text.

Must be called in response to a user gesture event, like `click` or `keyup`.

#### options

Type: `object`

##### target

Type: `HTMLElement`\
Default: `document.body`

Specify a DOM element where the temporary, behind-the-scenes `textarea` should be appended, in cases where you need to stay within a focus trap, like in a modal.

## Related

- [clipboardy](https://github.com/sindresorhus/clipboardy) - Access the system clipboard (copy/paste) in Node.js
