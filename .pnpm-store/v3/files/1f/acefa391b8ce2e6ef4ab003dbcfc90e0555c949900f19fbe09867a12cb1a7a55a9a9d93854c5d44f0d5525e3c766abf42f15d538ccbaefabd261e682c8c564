# file-selector

> A small package for converting a [DragEvent](https://developer.mozilla.org/en-US/docs/Web/API/DragEvent) or [file input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file) to a list of File objects.

[![npm](https://img.shields.io/npm/v/file-selector.svg?style=flat-square)](https://www.npmjs.com/package/file-selector)
![Tests](https://img.shields.io/github/actions/workflow/status/react-dropzone/file-selector/test.yml?branch=master&style=flat-square&label=tests)
[![codecov](https://img.shields.io/coveralls/github/react-dropzone/file-selector/master?style=flat-square)](https://coveralls.io/github/react-dropzone/file-selector?branch=master)
[![Open Collective Backers](https://img.shields.io/opencollective/backers/react-dropzone.svg?style=flat-square)](#backers)
[![Open Collective Sponsors](https://img.shields.io/opencollective/sponsors/react-dropzone.svg?style=flat-square)](#sponsors)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg?style=flat-square)](https://github.com/react-dropzone/.github/blob/main/CODE_OF_CONDUCT.md)

# Table of Contents

* [Installation](#installation)
* [Usage](#usage)
* [Browser Support](#browser-support)
* [Contribute](#contribute)
* [Credits](#credits)
* [Support](#support)
* [License](#license)


## Installation
You can install this package from [NPM](https://www.npmjs.com):
```bash
npm add file-selector
```

### CDN
For CDN, you can use [unpkg](https://unpkg.com):

[https://unpkg.com/file-selector/dist/bundles/file-selector.umd.min.js](https://unpkg.com/file-selector/dist/bundles/file-selector.umd.min.js)

The global namespace for file-selector is `fileSelector`:
```js
const {fromEvent} = fileSelector;
document.addEventListener('drop', async evt => {
    const files = await fromEvent(evt);
    console.log(files);
});
```


## Usage

### ES6
Convert a [DragEvent](https://developer.mozilla.org/en-US/docs/Web/API/DragEvent) to File objects:
```ts
import {fromEvent} from 'file-selector';
document.addEventListener('drop', async evt => {
    const files = await fromEvent(evt);
    console.log(files);
});
```

Convert a [change event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event) for an input type file to File objects:
```ts
import {fromEvent} from 'file-selector';
const input = document.getElementById('myInput');
input.addEventListener('change', async evt => {
    const files = await fromEvent(evt);
    console.log(files);
});
```

Convert [FileSystemFileHandle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle) items to File objects:
```ts
import {fromEvent} from 'file-selector';

// Open file picker
const handles = await window.showOpenFilePicker({multiple: true});
// Get the files
const files = await fromEvent(handles);
console.log(files);
```
**NOTE** The above is experimental and subject to change.

### CommonJS
Convert a `DragEvent` to File objects:
```ts
const {fromEvent} = require('file-selector');
document.addEventListener('drop', async evt => {
    const files = await fromEvent(evt);
    console.log(files);
});
```


## Browser Support
Most browser support basic File selection with drag 'n' drop or file input:
* [File API](https://developer.mozilla.org/en-US/docs/Web/API/File#Browser_compatibility)
* [Drag Event](https://developer.mozilla.org/en-US/docs/Web/API/DragEvent#Browser_compatibility)
* [DataTransfer](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#Browser_compatibility)
* [`<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#Browser_compatibility)

For folder drop we use the [FileSystem API](https://developer.mozilla.org/en-US/docs/Web/API/FileSystem) which has very limited support:
* [DataTransferItem.getAsFile()](https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/getAsFile#Browser_compatibility)
* [DataTransferItem.webkitGetAsEntry()](https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry#Browser_compatibility)
* [FileSystemEntry](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry#Browser_compatibility)
* [FileSystemFileEntry.file()](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileEntry/file#Browser_compatibility)
* [FileSystemDirectoryEntry.createReader()](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry/createReader#Browser_compatibility)
* [FileSystemDirectoryReader.readEntries()](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryReader/readEntries#Browser_compatibility)


## Contribute
Checkout the organization [CONTRIBUTING.md](https://github.com/react-dropzone/.github/blob/main/CONTRIBUTING.md).

## Credits
* [html5-file-selector](https://github.com/quarklemotion/html5-file-selector)

## Support

### Backers
Support us with a monthly donation and help us continue our activities. [[Become a backer](https://opencollective.com/react-dropzone#backer)]

<a href="https://opencollective.com/react-dropzone/backer/0/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/0/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/backer/1/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/1/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/backer/2/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/2/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/backer/3/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/3/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/backer/4/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/4/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/backer/5/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/5/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/backer/6/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/6/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/backer/7/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/7/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/backer/8/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/8/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/backer/9/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/9/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/backer/10/website" target="_blank"><img src="https://opencollective.com/react-dropzone/backer/10/avatar.svg"></a>

### Sponsors
Become a sponsor and get your logo on our README on Github with a link to your site. [[Become a sponsor](https://opencollective.com/react-dropzone#sponsor)]

<a href="https://opencollective.com/react-dropzone/sponsor/0/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/sponsor/1/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/sponsor/2/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/sponsor/3/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/sponsor/4/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/sponsor/5/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/sponsor/6/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/sponsor/7/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/sponsor/8/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/sponsor/9/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/9/avatar.svg"></a>
<a href="https://opencollective.com/react-dropzone/sponsor/10/website" target="_blank"><img src="https://opencollective.com/react-dropzone/sponsor/10/avatar.svg"></a>

## License
MIT
