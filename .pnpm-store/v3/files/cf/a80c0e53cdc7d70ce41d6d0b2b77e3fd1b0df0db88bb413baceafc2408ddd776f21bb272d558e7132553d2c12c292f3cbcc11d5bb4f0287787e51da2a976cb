"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serve = serve;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const http_1 = tslib_1.__importDefault(require("http"));
const path_1 = tslib_1.__importDefault(require("path"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const serve_handler_1 = tslib_1.__importDefault(require("serve-handler"));
const utils_common_1 = require("@docusaurus/utils-common");
const openBrowser_1 = tslib_1.__importDefault(require("./utils/openBrowser/openBrowser"));
const config_1 = require("../server/config");
const build_1 = require("./build/build");
const getHostPort_1 = require("../server/getHostPort");
function redirect(res, location) {
    res.writeHead(302, {
        Location: location,
    });
    res.end();
}
async function serve(siteDirParam = '.', cliOptions = {}) {
    const siteDir = await fs_extra_1.default.realpath(siteDirParam);
    const buildDir = cliOptions.dir ?? utils_1.DEFAULT_BUILD_DIR_NAME;
    const outDir = path_1.default.resolve(siteDir, buildDir);
    if (cliOptions.build) {
        await (0, build_1.build)(siteDir, {
            config: cliOptions.config,
            outDir,
        });
    }
    const { host, port } = await (0, getHostPort_1.getHostPort)(cliOptions);
    if (port === null) {
        process.exit();
    }
    const { siteConfig: { baseUrl, trailingSlash }, } = await (0, config_1.loadSiteConfig)({
        siteDir,
        customConfigFilePath: cliOptions.config,
    });
    const servingUrl = `http://${host}:${port}`;
    const server = http_1.default.createServer((req, res) => {
        // Automatically redirect requests to /baseUrl/
        if (!req.url?.startsWith(baseUrl)) {
            redirect(res, baseUrl);
            return;
        }
        // We do the redirect ourselves for a good reason
        // server-handler is annoying and won't include /baseUrl/ in redirects
        // See https://github.com/facebook/docusaurus/issues/10078#issuecomment-2084932934
        if (baseUrl !== '/') {
            // Not super robust, but should be good enough for our use case
            // See https://github.com/facebook/docusaurus/pull/10090
            const looksLikeAsset = !!req.url.match(/\.[a-zA-Z\d]{1,4}$/);
            if (!looksLikeAsset) {
                const normalizedUrl = (0, utils_common_1.applyTrailingSlash)(req.url, {
                    trailingSlash,
                    baseUrl,
                });
                if (req.url !== normalizedUrl) {
                    redirect(res, normalizedUrl);
                    return;
                }
            }
        }
        // Remove baseUrl before calling serveHandler, because /baseUrl/ should
        // serve /build/index.html, not /build/baseUrl/index.html (does not exist)
        // Note server-handler is really annoying here:
        // - no easy way to do rewrites such as "/baseUrl/:path" => "/:path"
        // - no easy way to "reapply" the baseUrl to the redirect "Location" header
        // See also https://github.com/facebook/docusaurus/pull/10090
        req.url = req.url.replace(baseUrl, '/');
        (0, serve_handler_1.default)(req, res, {
            cleanUrls: true,
            public: outDir,
            trailingSlash,
            directoryListing: false,
        });
    });
    const url = servingUrl + baseUrl;
    logger_1.default.success `Serving path=${buildDir} directory at: url=${url}`;
    server.listen(port);
    if (cliOptions.open && !process.env.CI) {
        await (0, openBrowser_1.default)(url);
    }
}
