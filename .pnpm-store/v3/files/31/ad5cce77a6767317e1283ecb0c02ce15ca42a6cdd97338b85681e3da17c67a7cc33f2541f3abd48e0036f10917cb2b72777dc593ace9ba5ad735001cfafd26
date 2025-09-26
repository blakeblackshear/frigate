# addCommand(command, [params])

Adds a command to the end of the pipeline of the shell object.

#### Arguments

* **command** - A PowerShell command or a path to a PowerShell script. `[String] _required_`
* **params [DEPRECATED]** - A Set of parameters to be added to the command. `[Array/String] (Default: []) _optional_`
  * {name: '', value: ''}
  * {name: value}
  * 'switch'

> addCommand() with the @param syntax is no longer supported. please use ES6 string templates instead.

#### Returns

[Promise] - A promise that fulfills with the array of commands currently in the pipeline, or rejects with an error.

#### Example

```javascript
// 'Write-Host node-powershell'
ps.addCommand('Write-Host node-powershell');

// script-syntax: https://ss64.com/ps/syntax-run.html
ps.addCommand('./script.ps1');
ps.addCommand(`& "${require('path').resolve(__dirname, 'script.ps1')}"`);
```