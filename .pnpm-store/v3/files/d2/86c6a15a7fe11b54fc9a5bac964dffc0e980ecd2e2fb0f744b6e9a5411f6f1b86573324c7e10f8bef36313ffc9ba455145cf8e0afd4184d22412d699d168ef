"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCLI = runCLI;
exports.createCLIProgram = createCLIProgram;
const tslib_1 = require("tslib");
const logger_1 = require("@docusaurus/logger");
const commander_1 = tslib_1.__importDefault(require("commander"));
const utils_1 = require("@docusaurus/utils");
const build_1 = require("./build/build");
const clear_1 = require("./clear");
const deploy_1 = require("./deploy");
const external_1 = require("./external");
const serve_1 = require("./serve");
const start_1 = require("./start/start");
const swizzle_1 = require("./swizzle");
const writeHeadingIds_1 = require("./writeHeadingIds");
const writeTranslations_1 = require("./writeTranslations");
function concatLocaleOptions(locale, locales = []) {
    return locales.concat(locale);
}
function isInternalCommand(command) {
    return (command &&
        [
            'start',
            'build',
            'swizzle',
            'deploy',
            'serve',
            'clear',
            'write-translations',
            'write-heading-ids',
        ].includes(command));
}
// TODO: Annoying, we must assume default site dir is '.' because there's
//  no way to know the siteDir/config yet.
//  The individual CLI commands can declare/read siteDir on their own
//  The env variable is an escape hatch
//  See https://github.com/facebook/docusaurus/issues/8903
const DEFAULT_SITE_DIR = process.env.DOCUSAURUS_CLI_SITE_DIR ?? '.';
// Similarly we give an env escape hatch for config
// See https://github.com/facebook/docusaurus/issues/8903
const DEFAULT_CONFIG = process.env.DOCUSAURUS_CLI_CONFIG ?? undefined;
async function runCLI(cliArgs) {
    const program = await createCLIProgram({
        cli: commander_1.default,
        cliArgs,
        siteDir: DEFAULT_SITE_DIR,
        config: DEFAULT_CONFIG,
    });
    await program.parseAsync(cliArgs);
}
async function createCLIProgram({ cli, cliArgs, siteDir, config, }) {
    const command = cliArgs[2];
    cli.version(utils_1.DOCUSAURUS_VERSION).usage('<command> [options]');
    cli
        .command('build [siteDir]')
        .description('Build website.')
        .option('--dev', 'Builds the website in dev mode, including full React error messages.')
        .option('--bundle-analyzer', 'visualize size of webpack output files with an interactive zoomable tree map (default: false)')
        .option('--out-dir <dir>', 'the full path for the new output directory, relative to the current workspace (default: build)')
        .option('--config <config>', 'path to docusaurus config file (default: `[siteDir]/docusaurus.config.js`)')
        .option('-l, --locale <locale...>', 'build the site in the specified locale(s). Build all known locales otherwise', concatLocaleOptions)
        .option('--no-minify', 'build website without minimizing JS bundles (default: false)')
        .action(build_1.build);
    cli
        .command('swizzle [themeName] [componentName] [siteDir]')
        .description('Wraps or ejects the original theme files into website folder for customization.')
        .option('-w, --wrap', 'Creates a wrapper around the original theme component.\nAllows rendering other components before/after the original theme component.')
        .option('-e, --eject', 'Ejects the full source code of the original theme component.\nAllows overriding the original component entirely with your own UI and logic.')
        .option('-l, --list', 'only list the available themes/components without further prompting (default: false)')
        .option('-t, --typescript', 'copy TypeScript theme files when possible (default: false)')
        .option('-j, --javascript', 'copy JavaScript theme files when possible (default: false)')
        .option('--danger', 'enable swizzle for unsafe component of themes')
        .option('--config <config>', 'path to Docusaurus config file (default: `[siteDir]/docusaurus.config.js`)')
        .action(swizzle_1.swizzle);
    cli
        .command('deploy [siteDir]')
        .description('Deploy website to GitHub pages.')
        .option('-l, --locale <locale>', 'deploy the site in the specified locale(s). Deploy all known locales otherwise', concatLocaleOptions)
        .option('--out-dir <dir>', 'the full path for the new output directory, relative to the current workspace (default: build)')
        .option('--config <config>', 'path to Docusaurus config file (default: `[siteDir]/docusaurus.config.js`)')
        .option('--skip-build', 'skip building website before deploy it (default: false)')
        .option('--target-dir <dir>', 'path to the target directory to deploy to (default: `.`)')
        .action(deploy_1.deploy);
    function normalizePollValue(value) {
        if (value === undefined || value === '') {
            return false;
        }
        const parsedIntValue = Number.parseInt(value, 10);
        if (!Number.isNaN(parsedIntValue)) {
            return parsedIntValue;
        }
        return value === 'true';
    }
    cli
        .command('start [siteDir]')
        .description('Start the development server.')
        .option('-p, --port <port>', 'use specified port (default: 3000)')
        .option('-h, --host <host>', 'use specified host (default: localhost)')
        .option('-l, --locale <locale>', 'use specified site locale')
        .option('--hot-only', 'do not fallback to page refresh if hot reload fails (default: false)')
        .option('--config <config>', 'path to Docusaurus config file (default: `[siteDir]/docusaurus.config.js`)')
        .option('--no-open', 'do not open page in the browser (default: false)')
        .option('--poll [interval]', 'use polling rather than watching for reload (default: false). Can specify a poll interval in milliseconds', normalizePollValue)
        .option('--no-minify', 'build website without minimizing JS bundles (default: false)')
        .action(start_1.start);
    cli
        .command('serve [siteDir]')
        .description('Serve website locally.')
        .option('--dir <dir>', 'the full path for the new output directory, relative to the current workspace (default: build)')
        .option('--config <config>', 'path to Docusaurus config file (default: `[siteDir]/docusaurus.config.js`)')
        .option('-p, --port <port>', 'use specified port (default: 3000)')
        .option('--build', 'build website before serving (default: false)')
        .option('-h, --host <host>', 'use specified host (default: localhost)')
        .option('--no-open', 'do not open page in the browser (default: false, or true in CI)')
        .action(serve_1.serve);
    cli
        .command('clear [siteDir]')
        .description('Remove build artifacts.')
        .action(clear_1.clear);
    cli
        .command('write-translations [siteDir]')
        .description('Extract required translations of your site.')
        .option('-l, --locale <locale>', 'the locale folder to write the translations.\n"--locale fr" will write translations in the ./i18n/fr folder.')
        .option('--override', 'By default, we only append missing translation messages to existing translation files. This option allows to override existing translation messages. Make sure to commit or backup your existing translations, as they may be overridden. (default: false)')
        .option('--config <config>', 'path to Docusaurus config file (default:`[siteDir]/docusaurus.config.js`)')
        .option('--messagePrefix <messagePrefix>', 'Allows to init new written messages with a given prefix. This might help you to highlight untranslated message by making them stand out in the UI (default: "")')
        .action(writeTranslations_1.writeTranslations);
    cli
        .command('write-heading-ids [siteDir] [files...]')
        .description('Generate heading ids in Markdown content.')
        .option('--maintain-case', "keep the headings' casing, otherwise make all lowercase (default: false)")
        .option('--overwrite', 'overwrite existing heading IDs (default: false)')
        .action(writeHeadingIds_1.writeHeadingIds);
    cli.arguments('<command>').action((cmd) => {
        cli.outputHelp();
        if (!cmd) {
            throw new Error(logger_1.logger.interpolate `Missing Docusaurus CLI command.`);
        }
        throw new Error(logger_1.logger.interpolate `Unknown Docusaurus CLI command code=${cmd}`);
    });
    // There is an unrecognized subcommand
    // Let plugins extend the CLI before parsing
    if (!isInternalCommand(command)) {
        await (0, external_1.externalCommand)({ cli, siteDir, config });
    }
    return cli;
}
