# addParameter(parameter)

Adds a parameter to the command string.

#### Arguments

* **parameter** - The parameter to add to the command. Must be in one of the following forms: {paramName: paramValue}, {paramName: '', paramValue: ''}. `[Object] _required_`

#### Returns

[PSCommand] - A new PSCommand object with the added parameter.

#### Example

```javascript
// 'Write-Host node-powershell -foregroundcolor red -nonewline'
let cmd1 = new PSCommand('Write-Host node-powershell').addParameter({foregroundcolor: 'red'}).addParameter({nonewline: null});
let cmd2 = new PSCommand('Write-Host node-powershell').addParameter({name: 'foregroundcolor', value: 'red'}).addParameter({name: 'nonewline', value: null});
```