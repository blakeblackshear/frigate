# addParameters(parameters)

Adds multiple parameters to the last added command.

#### Arguments

* **parameters** - The parameters array to add to the last command. Each parameter must be in one of the following forms: {paramName: paramValue}, {paramName: '', paramValue: ''}. `[Array] _required_`

#### Returns

[Promise] - A promise that fulfills with the array of commands currently in the pipeline, or rejects with an error.

#### Example

```javascript
// 'Write-Host node-powershell -foregroundcolor red -nonewline'
ps.addCommand('Write-Host node-powershell')
  .then(() => ps.addParameters([
    {foregroundcolor: 'red'},
    {nonewline: null} //switch
  ]));

// 'Write-Host node-powershell -foregroundcolor red -nonewline'
ps.addCommand('Write-Host node-powershell')
  .then(() => ps.addParameters([
    {name: 'foregroundcolor', value: 'red'},
    {name: 'nonewline', value: null} //switch
  ]));
```