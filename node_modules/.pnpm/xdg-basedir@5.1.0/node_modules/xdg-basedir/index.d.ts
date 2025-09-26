/**
Directory for user-specific data files.

@example
```
import {xdgData} from 'xdg-basedir';

console.log(xdgData);
//=> '/home/sindresorhus/.local/share'
```
*/
export const xdgData: string | undefined;

/**
Directory for user-specific configuration files.

@example
```
import {xdgConfig} from 'xdg-basedir';

console.log(xdgConfig);
//=> '/home/sindresorhus/.config'
```
*/
export const xdgConfig: string | undefined;

/**
Directory for user-specific state files.

@example
```
import {xdgState} from 'xdg-basedir';

console.log(xdgState);
//=> '/home/sindresorhus/.local/state'
```
*/
export const xdgState: string | undefined;

/**
Directory for user-specific non-essential data files.

@example
```
import {xdgCache} from 'xdg-basedir';

console.log(xdgCache);
//=> '/home/sindresorhus/.cache'
```
*/
export const xdgCache: string | undefined;

/**
Directory for user-specific non-essential runtime files and other file objects (such as sockets, named pipes, etc).

@example
```
import {xdgRuntime} from 'xdg-basedir';

console.log(xdgRuntime);
//=> '/run/user/sindresorhus'
```
*/
export const xdgRuntime: string | undefined;

/**
Preference-ordered array of base directories to search for data files in addition to `xdgData`.

@example
```
import {xdgDataDirectories} from 'xdg-basedir';

console.log(xdgDataDirectories);
//=> ['/home/sindresorhus/.local/share', '/usr/local/share/', '/usr/share/']
```
*/
export const xdgDataDirectories: readonly string[];

/**
Preference-ordered array of base directories to search for configuration files in addition to `xdgConfig`.

@example
```
import {xdgConfigDirectories} from 'xdg-basedir';

console.log(xdgConfigDirectories);
//=> ['/home/sindresorhus/.config', '/etc/xdg']
```
*/
export const xdgConfigDirectories: readonly string[];
