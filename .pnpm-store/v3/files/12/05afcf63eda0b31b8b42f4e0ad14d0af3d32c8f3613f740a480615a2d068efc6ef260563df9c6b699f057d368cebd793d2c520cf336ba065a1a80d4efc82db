# Initialize [Constructor]
Creates a new PSCommand instance.

#### Arguments

* **command** - A PowerShell command or a path to a PowerShell script. `[String] _required_`

#### Returns
[PSCommand] - An object providing methods that are used to construct a PowerShell command to be later invoked in the [Shell](../Shell/README.md).

#### Example
```javascript
import Shell, { PSCommand } from 'node-powershell'
const ps = new Shell();

// 'Write-Host node-powershell'
let cmd = new PSCommand('Write-Host node-powershell');
let script = new PSCommand(`& "${require('path').resolve(__dirname, 'script.ps1')}"`);

ps.addCommand(cmd);
ps.addCommand(script);
```