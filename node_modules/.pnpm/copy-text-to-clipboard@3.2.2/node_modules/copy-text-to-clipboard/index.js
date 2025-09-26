export default function copyTextToClipboard(text, {target = document.body} = {}) {
	if (typeof text !== 'string') {
		throw new TypeError(`Expected parameter \`text\` to be a \`string\`, got \`${typeof text}\`.`);
	}

	const element = document.createElement('textarea');
	const previouslyFocusedElement = document.activeElement;

	element.value = text;

	// Prevent keyboard from showing on mobile
	element.setAttribute('readonly', '');

	// Reset all inherited styles to prevent CSS interference
	element.style.all = 'unset';

	// Apply minimal required styles
	element.style.contain = 'strict';
	element.style.position = 'absolute';
	element.style.left = '-9999px';
	element.style.width = '2em';
	element.style.height = '2em';
	element.style.padding = '0';
	element.style.border = 'none';
	element.style.outline = 'none';
	element.style.boxShadow = 'none';
	element.style.background = 'transparent';
	element.style.fontSize = '12pt'; // Prevent zooming on iOS
	element.style.whiteSpace = 'pre'; // Preserve whitespace (tabs, spaces, newlines)

	const selection = document.getSelection();
	const originalRange = selection.rangeCount > 0 && selection.getRangeAt(0);

	target.append(element);
	element.select();

	// Explicit selection workaround for iOS
	element.selectionStart = 0;
	element.selectionEnd = text.length;

	let isSuccess = false;
	try {
		isSuccess = document.execCommand('copy');
	} catch {}

	element.remove();

	if (originalRange) {
		selection.removeAllRanges();
		selection.addRange(originalRange);
	}

	// Get the focus back on the previously focused element, if any
	if (previouslyFocusedElement) {
		previouslyFocusedElement.focus();
	}

	return isSuccess;
}
