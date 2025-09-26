# addParameter(parameter)

Adds a parameter to the last added command.

#### Arguments

* **parameter** - The parameter to add to the last command. Must be in one of the following forms: {paramName: paramValue}, {paramName: '', paramValue: ''}. `[Object] _required_`

#### Returns

[Promise] - A promise that fulfills with the array of commands currently in the pipeline, or rejects with an error.

#### Example

```javascript
// 'Write-Host node-powershell -foregroundcolor red -nonewline'
ps.addCommand('Write-Host node-powershell')
  .then(() => ps.addParameter({foregroundcolor: 'red'}))
  .then(() => ps.addParameter({nonewline: null})) //switch;

// 'Write-Host node-powershell -foregroundcolor red -nonewline'
ps.addCommand('Write-Host node-powershell')
  .then(() => ps.addParameter({name: 'foregroundcolor', value: 'red'}))
  .then(() => ps.addParameter({name: 'nonewline', value: null})); //switch
```