"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = openBrowser;
const tslib_1 = require("tslib");
// This code was initially in CRA/react-dev-utils (deprecated in 2025)
// We copied and refactored it
// See https://github.com/facebook/docusaurus/pull/10956
// See https://github.com/facebook/create-react-app/blob/main/packages/react-dev-utils/openBrowser.js
/* eslint-disable */
const child_process_1 = require("child_process");
const util_1 = require("util");
const open_1 = tslib_1.__importDefault(require("open"));
const logger_1 = require("@docusaurus/logger");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
// Not sure if we need this, but let's keep a secret escape hatch
// CRA/react-dev-utils supported BROWSER/BROWSER_ARGS
const BrowserEnv = process.env.DOCUSAURUS_BROWSER;
const BrowserEnvArgs = process.env.DOCUSAURUS_BROWSER_ARGS
    ? process.env.DOCUSAURUS_BROWSER_ARGS.split(' ')
    : [];
// If we're on OS X, the user hasn't specifically
// requested a different browser, we can try opening
// Chrome with AppleScript. This lets us reuse an
// existing tab when possible instead of creating a new one.
// Copied from https://github.com/facebook/create-react-app/blob/main/packages/react-dev-utils/openBrowser.js
async function tryOpenWithAppleScript({ url, browser, }) {
    const shouldTryOpenChromiumWithAppleScript = process.platform === 'darwin' &&
        (typeof browser !== 'string' || browser === 'google chrome');
    if (!shouldTryOpenChromiumWithAppleScript) {
        return false;
    }
    if (shouldTryOpenChromiumWithAppleScript) {
        async function getBrowsersToTry() {
            // Will use the first open browser found from list
            const supportedChromiumBrowsers = [
                'Google Chrome Canary',
                'Google Chrome Dev',
                'Google Chrome Beta',
                'Google Chrome',
                'Microsoft Edge',
                'Brave Browser',
                'Vivaldi',
                'Chromium',
                'Arc',
            ];
            // Among all the supported browsers, retrieves to stdout the active ones
            const command = `ps cax -o command | grep -E "^(${supportedChromiumBrowsers.join('|')})$"`;
            const result = await Promise
                // TODO Docusaurus v4: use Promise.try()
                // See why here https://github.com/facebook/docusaurus/issues/11204#issuecomment-3073480330
                .resolve()
                .then(() => execPromise(command))
                .catch(() => {
                // Ignore all errors
                // In particular grep errors when macOS user has no Chromium-based browser open
                // See https://github.com/facebook/docusaurus/issues/11204
            });
            if (!result) {
                return [];
            }
            const activeBrowsers = result.stdout.toString().trim().split('\n');
            // This preserves the initial browser order
            // We open Google Chrome Canary in priority over Google Chrome
            return supportedChromiumBrowsers.filter((b) => activeBrowsers.includes(b));
        }
        async function tryBrowser(browserName) {
            try {
                // This command runs the openChrome.applescript (copied from CRA)
                const command = `osascript openChrome.applescript "${encodeURI(url)}" "${browserName}"`;
                await execPromise(command, {
                    cwd: __dirname,
                });
                return true;
            }
            catch (err) {
                console.error(`Failed to open browser ${browserName} with AppleScript`, err);
                return false;
            }
        }
        const browsers = await logger_1.PerfLogger.async('getBrowsersToTry', () => getBrowsersToTry());
        for (let browser of browsers) {
            const success = await logger_1.PerfLogger.async(browser, () => tryBrowser(browser));
            if (success) {
                return true;
            }
        }
    }
    return false;
}
function toOpenApp(params) {
    if (!params.browser) {
        return undefined;
    }
    // Handles "cross-platform" shortcuts like "chrome", "firefox", "edge"
    if (open_1.default.apps[params.browser]) {
        return {
            name: open_1.default.apps[params.browser],
            arguments: params.browserArgs,
        };
    }
    // Fallback to platform-specific app name
    return {
        name: params.browser,
        arguments: params.browserArgs,
    };
}
async function startBrowserProcess(params) {
    if (await logger_1.PerfLogger.async('tryOpenWithAppleScript', () => tryOpenWithAppleScript(params))) {
        return true;
    }
    try {
        await (0, open_1.default)(params.url, {
            app: toOpenApp(params),
            wait: false,
        });
        return true;
    }
    catch (err) {
        return false;
    }
}
/**
 * Returns true if it opened a browser
 */
async function openBrowser(url) {
    return startBrowserProcess({
        url,
        browser: BrowserEnv,
        browserArgs: BrowserEnvArgs,
    });
}
