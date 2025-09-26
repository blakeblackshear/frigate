# Getting Started

## Installation

Install from the NPM repository using yarn or npm:

```bash
$ npm i -S node-powershell
```

```bash
$ yarn add node-powershell
```


## Importing

### ES6

```javascript
import Shell from 'node-powershell'
```

### ES5 (CommonJS)

```javascript
const Shell = require('node-powershell')
```


## Quick start

```javascript
const shell = require('node-powershell');

let ps = new shell({
  executionPolicy: 'Bypass',
  noProfile: true
});

ps.addCommand('echo node-powershell')
ps.invoke()
.then(output => {
  console.log(output);
})
.catch(err => {
  console.log(err);
  ps.dispose();
});
```