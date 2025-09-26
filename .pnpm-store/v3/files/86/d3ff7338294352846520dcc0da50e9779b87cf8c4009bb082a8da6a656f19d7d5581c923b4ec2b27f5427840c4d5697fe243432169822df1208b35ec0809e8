# Properties

#### pid [Number]

A number representing the process id the PowerShell instance got.

#### streams [Object]

An object containing the [sdtio (in,out,err)](https://nodejs.org/api/child_process.html#child_process_child_stderr) [[stream.Readable]](https://nodejs.org/api/stream.html#stream_class_stream_readable) of the PowerShell instance.

```javascript
ps.streams.stdin.write();
ps.streams.stdout.on('data', data => {});
```

#### commands [Array]

An array containing the commands that currently in the pipeline (before invoke() called).

### history [Array]

An array containing the commands ever invoked in the shell, and their results.

```javascript
console.log(ps.history);
console.log(ps.history[0].commands);
console.log(ps.history[0].hadErrors);
console.log(ps.history[0].results);
```

#### invocationStateInfo [String]

A string representing the execution state of the current PowerShell instance. [read more](https://docs.microsoft.com/en-us/dotnet/api/system.management.automation.psinvocationstate?view=powershellsdk-1.1.0)

#### verbose [Boolean]

A boolean determines whether to log verbose to the console.
