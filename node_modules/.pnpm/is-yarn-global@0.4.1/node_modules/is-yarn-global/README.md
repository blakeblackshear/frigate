# is-yarn-global

[![](https://img.shields.io/npm/v/is-yarn-global.svg)](https://www.npmjs.com/package/is-yarn-global)
[![](https://img.shields.io/npm/l/is-yarn-global.svg)](https://github.com/LitoMore/is-yarn-global/blob/master/LICENSE)
[![](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)

Check if installed by yarn globally without any `fs` calls

## Install

```bash
$ npm install is-yarn-global
```

## Usage

Just require it in your package.

```javascript
import isYarnGlobal from 'is-yarn-global';

console.log(isYarnGlobal());
```

## License

MIT © [LitoMore](https://github.com/LitoMore)
