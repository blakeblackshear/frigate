import process from 'node:process';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {format} from 'node:util';
import ConfigStore from 'configstore';
import chalk from 'chalk';
import semver from 'semver';
import semverDiff from 'semver-diff';
import latestVersion from 'latest-version';
import {isNpmOrYarn} from 'is-npm';
import isInstalledGlobally from 'is-installed-globally';
import isYarnGlobal from 'is-yarn-global';
import hasYarn from 'has-yarn';
import boxen from 'boxen';
import {xdgConfig} from 'xdg-basedir';
import isCi from 'is-ci';
import pupa from 'pupa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ONE_DAY = 1000 * 60 * 60 * 24;

export default class UpdateNotifier {
	// Public
	config;
	update;

	// Semi-private (used for tests)
	_packageName;
	_shouldNotifyInNpmScript;

	#options;
	#packageVersion;
	#updateCheckInterval;
	#isDisabled;

	constructor(options = {}) {
		this.#options = options;
		options.pkg = options.pkg || {};
		options.distTag = options.distTag || 'latest';

		// Reduce pkg to the essential keys. with fallback to deprecated options
		// TODO: Remove deprecated options at some point far into the future
		options.pkg = {
			name: options.pkg.name || options.packageName,
			version: options.pkg.version || options.packageVersion,
		};

		if (!options.pkg.name || !options.pkg.version) {
			throw new Error('pkg.name and pkg.version required');
		}

		this._packageName = options.pkg.name;
		this.#packageVersion = options.pkg.version;
		this.#updateCheckInterval = typeof options.updateCheckInterval === 'number' ? options.updateCheckInterval : ONE_DAY;
		this.#isDisabled = 'NO_UPDATE_NOTIFIER' in process.env
			|| process.env.NODE_ENV === 'test'
			|| process.argv.includes('--no-update-notifier')
			|| isCi;
		this._shouldNotifyInNpmScript = options.shouldNotifyInNpmScript;

		if (!this.#isDisabled) {
			try {
				this.config = new ConfigStore(`update-notifier-${this._packageName}`, {
					optOut: false,
					// Init with the current time so the first check is only
					// after the set interval, so not to bother users right away
					lastUpdateCheck: Date.now(),
				});
			} catch {
				// Expecting error code EACCES or EPERM
				const message
					= chalk.yellow(format(' %s update check failed ', options.pkg.name))
					+ format('\n Try running with %s or get access ', chalk.cyan('sudo'))
					+ '\n to the local update config store via \n'
					+ chalk.cyan(format(' sudo chown -R $USER:$(id -gn $USER) %s ', xdgConfig));

				process.on('exit', () => {
					console.error(boxen(message, {textAlignment: 'center'}));
				});
			}
		}
	}

	check() {
		if (
			!this.config
			|| this.config.get('optOut')
			|| this.#isDisabled
		) {
			return;
		}

		this.update = this.config.get('update');

		if (this.update) {
			// Use the real latest version instead of the cached one
			this.update.current = this.#packageVersion;

			// Clear cached information
			this.config.delete('update');
		}

		// Only check for updates on a set interval
		if (Date.now() - this.config.get('lastUpdateCheck') < this.#updateCheckInterval) {
			return;
		}

		// Spawn a detached process, passing the options as an environment property
		spawn(process.execPath, [path.join(__dirname, 'check.js'), JSON.stringify(this.#options)], {
			detached: true,
			stdio: 'ignore',
		}).unref();
	}

	async fetchInfo() {
		const {distTag} = this.#options;
		const latest = await latestVersion(this._packageName, {version: distTag});

		return {
			latest,
			current: this.#packageVersion,
			type: semverDiff(this.#packageVersion, latest) || distTag,
			name: this._packageName,
		};
	}

	notify(options) {
		const suppressForNpm = !this._shouldNotifyInNpmScript && isNpmOrYarn;
		if (!process.stdout.isTTY || suppressForNpm || !this.update || !semver.gt(this.update.latest, this.update.current)) {
			return this;
		}

		options = {
			isGlobal: isInstalledGlobally,
			isYarnGlobal: isYarnGlobal(),
			...options,
		};

		let installCommand;
		if (options.isYarnGlobal) {
			installCommand = `yarn global add ${this._packageName}`;
		} else if (options.isGlobal) {
			installCommand = `npm i -g ${this._packageName}`;
		} else if (hasYarn()) {
			installCommand = `yarn add ${this._packageName}`;
		} else {
			installCommand = `npm i ${this._packageName}`;
		}

		const defaultTemplate = 'Update available '
			+ chalk.dim('{currentVersion}')
			+ chalk.reset(' → ')
			+ chalk.green('{latestVersion}')
			+ ' \nRun ' + chalk.cyan('{updateCommand}') + ' to update';

		const template = options.message || defaultTemplate;

		options.boxenOptions = options.boxenOptions || {
			padding: 1,
			margin: 1,
			textAlignment: 'center',
			borderColor: 'yellow',
			borderStyle: 'round',
		};

		const message = boxen(
			pupa(template, {
				packageName: this._packageName,
				currentVersion: this.update.current,
				latestVersion: this.update.latest,
				updateCommand: installCommand,
			}),
			options.boxenOptions,
		);

		if (options.defer === false) {
			console.error(message);
		} else {
			process.on('exit', () => {
				console.error(message);
			});

			process.on('SIGINT', () => {
				console.error('');
				process.exit();
			});
		}

		return this;
	}
}
