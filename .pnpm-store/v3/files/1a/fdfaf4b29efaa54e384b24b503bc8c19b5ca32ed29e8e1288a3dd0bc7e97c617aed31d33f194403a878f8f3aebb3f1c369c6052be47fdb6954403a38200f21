# Initialize [Constructor]

Creates a new Shell instance.
Starts by default, a powershell process on Windows, and a powershell-core (pwsh) process on Linux and macOS.

### Arguments

#### node-powershell options:

* **verbose** - Determines whether to log verbose to the console. `[Boolean] (Default: true) _optional_`
* **pwsh** - Instruct the Shell to use pwsh as the PowerShell runspace. `[Boolean] (Default: false) _optional_ [Windows-Only]`
* **pwshPrev** - Instruct the Shell to use pwsh-preview as the PowerShell runspace. `[Boolean] (Default: true) _optional_`
* **inputEncoding** - Sets the input encoding for the current PowerShell process. `[String] (Default: 'utf8') _optional_`
* **outputEncoding** - Sets the output encoding for the current PowerShell process. `[String] (Default: 'utf8') _optional_`

#### powershell options:

All powershell options from [here](https://docs.microsoft.com/en-us/powershell/scripting/components/console/powershell.exe-command-line-help?view=powershell-6) are supported.

#### pwsh options:

All pwsh options from [here](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pwsh?view=powershell-6) are supported.

> * Both powershell and pwsh options should be passed in camel-case format. 
> * Both powershell and pwsh processes will be launched with the `noLogo` and `noExit` flags. Overriding this behavior is not recommended.

#### Returns

[Shell] - An object that provides [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) based methods that are used to create a pipeline of commands and invoke those commands within a PowerShell runspace.

#### Example

```javascript
import Shell from 'node-powershell'
const ps = new Shell({
  verbose: true,
  executionPolicy: 'Bypass',
  noProfile: true,
});
```
