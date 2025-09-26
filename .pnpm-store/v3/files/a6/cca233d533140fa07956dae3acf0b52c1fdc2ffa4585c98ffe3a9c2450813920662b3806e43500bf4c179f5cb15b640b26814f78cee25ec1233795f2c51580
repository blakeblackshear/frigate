/// <reference lib="dom"/>

export interface Options {
	/**
	Specify a DOM element where the temporary, behind-the-scenes `textarea` should be appended, in cases where you need to stay within a focus trap, like in a modal.

	@default document.body

	@example
	```
	import copy from 'copy-text-to-clipboard';

	const modalWithFocusTrap = document.getElementById('modal');

	button.addEventListener('click', () => {
		copy('🦄🌈', {
			target: modalWithFocusTrap
		});
	});
	```
	*/
	readonly target?: HTMLElement;
}

/**
Copy text to the clipboard.

Must be called in response to a user gesture event, like `click` or `keyup`.

@param text - The text to copy to clipboard.
@returns Whether it succeeded to copy the text.

@example
```
import copy from 'copy-text-to-clipboard';

button.addEventListener('click', () => {
	copy('🦄🌈');
});
```
*/
export default function copyTextToClipboard(text: string, options?: Options): boolean;
