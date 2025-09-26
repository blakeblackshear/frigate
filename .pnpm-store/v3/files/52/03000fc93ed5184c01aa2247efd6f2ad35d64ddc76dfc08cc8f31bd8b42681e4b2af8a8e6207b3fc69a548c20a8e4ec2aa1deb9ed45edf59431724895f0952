# update-notifier

> Update notifications for your CLI app

![](screenshot.png)

Inform users of your package of updates in a non-intrusive way.

#### Contents

- [Install](#install)
- [Usage](#usage)
- [How](#how)
- [API](#api)
- [About](#about)
- [Users](#users)

## Install

```sh
npm install update-notifier
```

## Usage

### Simple

```js
import updateNotifier from 'update-notifier';
import packageJson from './package.json' assert {type: 'json'};

updateNotifier({pkg: packageJson}).notify();
```

### Comprehensive

```js
import updateNotifier from 'update-notifier';
import packageJson from './package.json' assert {type: 'json'};

// Checks for available update and returns an instance
const notifier = updateNotifier({pkg: packageJson});

// Notify using the built-in convenience method
notifier.notify();

// `notifier.update` contains some useful info about the update
console.log(notifier.update);
/*
{
	latest: '1.0.1',
	current: '1.0.0',
	type: 'patch', // Possible values: latest, major, minor, patch, prerelease, build
	name: 'pageres'
}
*/
```

### Options and custom message

```js
const notifier = updateNotifier({
	pkg,
	updateCheckInterval: 1000 * 60 * 60 * 24 * 7 // 1 week
});

if (notifier.update) {
	console.log(`Update available: ${notifier.update.latest}`);
}
```

## How

Whenever you initiate the update notifier and it's not within the interval threshold, it will asynchronously check with npm in the background for available updates, then persist the result. The next time the notifier is initiated, the result will be loaded into the `.update` property. This prevents any impact on your package startup performance.
The update check is done in a unref'ed [child process](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options). This means that if you call `process.exit`, the check will still be performed in its own process.

The first time the user runs your app, it will check for an update, and even if an update is available, it will wait the specified `updateCheckInterval` before notifying the user. This is done to not be annoying to the user, but might surprise you as an implementer if you're testing whether it works. Check out [`example.js`](example.js) to quickly test out `update-notifier` and see how you can test that it works in your app.

## API

### notifier = updateNotifier(options)

Checks if there is an available update. Accepts options defined below. Returns an instance with an `.update` property if there is an available update, otherwise `undefined`.

### options

Type: `object`

#### pkg

Type: `object`

##### name

*Required*\
Type: `string`

##### version

*Required*\
Type: `string`

#### updateCheckInterval

Type: `number`\
Default: `1000 * 60 * 60 * 24` *(1 day)*

How often to check for updates.

#### shouldNotifyInNpmScript

Type: `boolean`\
Default: `false`

Allows notification to be shown when running as an npm script.

#### distTag

Type: `string`\
Default: `'latest'`

Which [dist-tag](https://docs.npmjs.com/adding-dist-tags-to-packages) to use to find the latest version.

### notifier.fetchInfo()

Check update information.

Returns an `object` with:

- `latest` _(String)_ - Latest version.
- `current` _(String)_ - Current version.
- `type` _(String)_ - Type of current update. Possible values: `latest`, `major`, `minor`, `patch`, `prerelease`, `build`.
- `name` _(String)_ - Package name.

### notifier.notify(options?)

Convenience method to display a notification message. *(See screenshot)*

Only notifies if there is an update and the process is [TTY](https://nodejs.org/api/process.html#process_a_note_on_process_i_o).

#### options

Type: `object`

##### defer

Type: `boolean`\
Default: `true`

Defer showing the notification to after the process has exited.

##### message

Type: `string`\
Default: [See above screenshot](https://github.com/yeoman/update-notifier#update-notifier-)

Message that will be shown when an update is available.

Available placeholders:

- `{packageName}` - Package name.
- `{currentVersion}` - Current version.
- `{latestVersion}` - Latest version.
- `{updateCommand}` - Update command.

```js
notifier.notify({message: 'Run `{updateCommand}` to update.'});

// Output:
// Run `npm install update-notifier-tester@1.0.0` to update.
```

##### isGlobal

Type: `boolean`\
Default: Auto-detect

Include the `-g` argument in the default message's `npm i` recommendation. You may want to change this if your CLI package can be installed as a dependency of another project, and don't want to recommend a global installation. This option is ignored if you supply your own `message` (see above).

##### boxenOptions

Type: `object`\
Default: `{padding: 1, margin: 1, textAlignment: 'center', borderColor: 'yellow', borderStyle: 'round'}` *(See screenshot)*

Options object that will be passed to [`boxen`](https://github.com/sindresorhus/boxen).

### User settings

Users of your module have the ability to opt-out of the update notifier by changing the `optOut` property to `true` in `~/.config/configstore/update-notifier-[your-module-name].json`. The path is available in `notifier.config.path`.

Users can also opt-out by [setting the environment variable](https://github.com/sindresorhus/guides/blob/main/set-environment-variables.md) `NO_UPDATE_NOTIFIER` with any value or by using the `--no-update-notifier` flag on a per run basis.

The check is also skipped automatically:
  - on CI
  - in unit tests (when the `NODE_ENV` environment variable is `test`)

## About

The idea for this module came from the desire to apply the browser update strategy to CLI tools, where everyone is always on the latest version. We first tried automatic updating, which we discovered wasn't popular. This is the second iteration of that idea, but limited to just update notifications.

## Users

There are a bunch projects using it:

- [npm](https://github.com/npm/npm) - Package manager for JavaScript
- [Yeoman](https://yeoman.io) - Modern workflows for modern webapps
- [AVA](https://avajs.dev) - Simple concurrent test runner
- [XO](https://github.com/xojs/xo) - JavaScript happiness style linter
- [Node GH](https://github.com/node-gh/gh) - GitHub command line tool

[And 2700+ more…](https://www.npmjs.org/browse/depended/update-notifier)

---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-update_notifier?utm_source=npm-update-notifier&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
