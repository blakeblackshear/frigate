# addArgument(argument)

Adds an argument to the last added command.

#### Arguments

* **argument** - The argument to add to the last command. `[String] _required_`

#### Returns

[Promise] - A promise that fulfills with the array of commands currently in the pipeline, or rejects with an error.

#### Example

```javascript
// 'Write-Host node-powershell'
ps.addCommand('Write-Host')
  .then(() => ps.addArgument('node-powershell'));
```