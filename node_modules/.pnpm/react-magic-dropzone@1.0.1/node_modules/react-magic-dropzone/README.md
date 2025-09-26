# ✨Magic Dropzone [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=Drag-and-drop%20files%20or%20urls!%20Built%20for%20React:&url=https://github.com/bourdakos1/react-magic-dropzone&hashtags=react,component,dropzone,developers)

[![Build Status](https://travis-ci.org/bourdakos1/react-magic-dropzone.svg?branch=master)](https://travis-ci.org/bourdakos1/react-magic-dropzone)
[![codecov](https://codecov.io/gh/bourdakos1/react-magic-dropzone/branch/master/graph/badge.svg)](https://codecov.io/gh/bourdakos1/react-magic-dropzone)
[![license](https://img.shields.io/github/license/bourdakos1/react-magic-dropzone.svg)](https://github.com/bourdakos1/react-magic-dropzone/blob/master/LICENSE)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![npm-version](https://img.shields.io/npm/v/react-magic-dropzone.svg)](https://www.npmjs.com/package/react-magic-dropzone)
[![npm-downloads](https://img.shields.io/npm/dm/react-magic-dropzone.svg)](https://www.npmjs.com/package/react-magic-dropzone)

<div align="center">
  <a href="https://codesandbox.io/embed/y200pqy4pz?view=preview"><img src="/screenshots/demo.gif" alt="demo.gif"></a>
  <div><i>Try out the <a href="https://codesandbox.io/embed/y200pqy4pz?view=preview">demo</a></i></div>
</div>

## Installation

```bash
yarn add react-magic-dropzone
```
or:
```bash
npm install --save react-magic-dropzone
```

## Usage

Import `MagicDropzone` in your React component:

```javascript static
import MagicDropzone from 'react-magic-dropzone'
```

```jsx
onDrop = (accepted, rejected, links) => {
  // Have fun
}
```

```jsx
<MagicDropzone
  accept="image/jpeg, image/png, .jpg, .jpeg, .png"
  onDrop={this.onDrop}
>
  Drop some files on me!
</MagicDropzone>
```

[![Edit y200pqy4pz](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/y200pqy4pz)

## License

MIT
