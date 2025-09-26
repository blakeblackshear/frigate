# xdg-basedir

> Get [XDG Base Directory](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) paths

This package is meant for Linux. You should not use XDG on macOS or Windows. Instead, you should follow their platform conventions. You can use [`env-paths`](https://github.com/sindresorhus/env-paths) for that.

## Install

```
$ npm install xdg-basedir
```

## Usage

```js
import {xdgData, xdgConfig, xdgDataDirectories} from 'xdg-basedir';

console.log(xdgData);
//=> '/home/sindresorhus/.local/share'

console.log(xdgConfig);
//=> '/home/sindresorhus/.config'

console.log(xdgDataDirectories);
//=> ['/home/sindresorhus/.local/share', '/usr/local/share/', '/usr/share/']
```

## API

The exports `xdgData`, `xdgConfig`, `xdgCache`, `xdgRuntime` will return `undefined` in the uncommon case that both the XDG environment variable is not set and the users home directory can't be found. You need to handle this case. A common solution is to [fall back to a temporary directory](https://github.com/yeoman/configstore/blob/b82690fc401318ad18dcd7d151a0003a4898a314/index.js#L15).

### xdgData

Directory for user-specific data files.

### xdgConfig

Directory for user-specific configuration files.

### xdgState

Directory for user-specific state files.

### xdgCache

Directory for user-specific non-essential data files.

### xdgRuntime

Directory for user-specific non-essential runtime files and other file objects (such as sockets, named pipes, etc).

### xdgDataDirectories

Preference-ordered array of base directories to search for data files in addition to `xdgData`.

### xdgConfigDirectories

Preference-ordered array of base directories to search for configuration files in addition to `xdgConfig`.

---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-xdg-basedir?utm_source=npm-xdg-basedir&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
