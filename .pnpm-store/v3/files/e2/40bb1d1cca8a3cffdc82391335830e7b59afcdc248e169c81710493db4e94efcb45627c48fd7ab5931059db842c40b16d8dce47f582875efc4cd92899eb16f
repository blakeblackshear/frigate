# Node-PowerShell

[![Build Status](https://img.shields.io/travis/rannn505/node-powershell.svg?style=flat-square)](https://travis-ci.org/rannn505/node-powershell) [![NPM Version](https://img.shields.io/npm/v/node-powershell.svg?style=flat-square)](https://www.npmjs.com/package/node-powershell) [![NPM Downloads](https://img.shields.io/npm/dt/node-powershell.svg?style=flat-square)](https://npm-stat.com/charts.html?package=node-powershell) [![Coveralls](https://img.shields.io/coveralls/rannn505/node-powershell.svg?style=flat-square)](https://coveralls.io/github/rannn505/node-powershell) [![Package Quality](http://npm.packagequality.com/shield/node-powershell.svg?style=flat-square)](http://packagequality.com/#?package=node-powershell) [![Closed Issues](https://img.shields.io/github/issues-closed-raw/rannn505/node-powershell.svg?style=flat-square)](https://github.com/rannn505/node-powershell/issues?q=is%3Aissue+is%3Aclosed) [![Dependencies](https://img.shields.io/david/rannn505/node-powershell.svg?style=flat-square)](https://david-dm.org/rannn505/node-powershell) [![License](https://img.shields.io/github/license/rannn505/node-powershell.svg?style=flat-square)](https://github.com/rannn505/node-powershell/blob/master/LICENSE) [![ GitHub Stars](https://img.shields.io/github/stars/rannn505/node-powershell.svg?style=social&label=Star)](https://github.com/rannn505/node-powershell/stargazers)

> Node-PowerShell taking advantage of two of the simplest, effective and easy tools that exist in the today technology world. On the one hand, [NodeJS](https://nodejs.org/en/) which made a revolution in the world of javascript, and on the other hand, [PowerShell](https://github.com/PowerShell/PowerShell) which recently came out with an initial open-source, cross-platform version, and by connecting them together, gives you the power to create any solution you were asked to, no matter if you are a programmer, an IT or a DevOps guy.

## Installation

```bash
$ npm i -S node-powershell
$ yarn add node-powershell
```

## Quick start

```javascript
const Shell = require('node-powershell');

const ps = new Shell({
  executionPolicy: 'Bypass',
  noProfile: true
});

ps.addCommand('echo node-powershell');
ps.invoke()
.then(output => {
  console.log(output);
})
.catch(err => {
  console.log(err);
});
```

## Documentation
[**Documentation**](https://rannn505.gitbook.io/node-powershell/)  

## PowerShell 6
[**Microsoft**](https://docs.microsoft.com/en-us/powershell/scripting/powershell-scripting?view=powershell-6)<br/>
[**GitHub**](https://github.com/PowerShell/PowerShell)

## TODO
- [x] Full pwsh support.
- [x] New docs & homepage.
- [x] PSCommand class.
- [x] CI improvements. 
- [ ] Postinstall script.
- [ ] Improve error handling.
- [ ] More examples.
- [ ] More test + coverage.
- [ ] Electron + Lambada POC.

## License

[MIT](https://github.com/rannn505/node-powershell/tree/fa9e41f1aa785e0a4614213bd5a965e0a46b4804/LICENSE/README.md) © [Ran Cohen](https://github.com/rannn505)

