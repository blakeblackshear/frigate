"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEBPACK_URL_LOADER_LIMIT = exports.DEFAULT_PLUGIN_ID = exports.DEFAULT_PORT = exports.CODE_TRANSLATIONS_FILE_NAME = exports.DEFAULT_I18N_DIR_NAME = exports.THEME_PATH = exports.OUTPUT_STATIC_ASSETS_DIR_NAME = exports.DEFAULT_STATIC_DIR_NAME = exports.SRC_DIR_NAME = exports.GENERATED_FILES_DIR_NAME = exports.BABEL_CONFIG_FILE_NAME = exports.DEFAULT_CONFIG_FILE_NAME = exports.DEFAULT_BUILD_DIR_NAME = exports.DOCUSAURUS_VERSION = exports.NODE_MINOR_VERSION = exports.NODE_MAJOR_VERSION = void 0;
/** Node major version, directly read from env. */
exports.NODE_MAJOR_VERSION = parseInt(process.versions.node.split('.')[0], 10);
/** Node minor version, directly read from env. */
exports.NODE_MINOR_VERSION = parseInt(process.versions.node.split('.')[1], 10);
/** Docusaurus core version. */
exports.DOCUSAURUS_VERSION = 
// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
require('../package.json').version;
/**
 * Can be overridden with cli option `--out-dir`. Code should generally use
 * `context.outDir` instead (which is always absolute and localized).
 */
exports.DEFAULT_BUILD_DIR_NAME = 'build';
/**
 * Can be overridden with cli option `--config`. Code should generally use
 * `context.siteConfigPath` instead (which is always absolute).
 *
 * This does not have extensions, so that we can substitute different ones
 * when resolving the path.
 */
exports.DEFAULT_CONFIG_FILE_NAME = 'docusaurus.config';
/** Can be absolute or relative to site directory. */
exports.BABEL_CONFIG_FILE_NAME = process.env.DOCUSAURUS_BABEL_CONFIG_FILE_NAME ?? 'babel.config.js';
/**
 * Can be absolute or relative to site directory. Code should generally use
 * `context.generatedFilesDir` instead (which is always absolute).
 */
exports.GENERATED_FILES_DIR_NAME = process.env.DOCUSAURUS_GENERATED_FILES_DIR_NAME ?? '.docusaurus';
/**
 * We would assume all of the site's JS code lives in here and not outside.
 * Relative to the site directory.
 */
exports.SRC_DIR_NAME = 'src';
/**
 * Can be overridden with `config.staticDirectories`. Code should use
 * `context.siteConfig.staticDirectories` instead (which is always absolute).
 */
exports.DEFAULT_STATIC_DIR_NAME = 'static';
/**
 * Files here are handled by webpack, hashed (can be cached aggressively).
 * Relative to the build output folder.
 */
exports.OUTPUT_STATIC_ASSETS_DIR_NAME = 'assets';
/**
 * Components in this directory will receive the `@theme` alias and be able to
 * shadow default theme components.
 */
exports.THEME_PATH = `${exports.SRC_DIR_NAME}/theme`;
/**
 * All translation-related data live here, relative to site directory. Content
 * will be namespaced by locale.
 */
exports.DEFAULT_I18N_DIR_NAME = 'i18n';
/**
 * Translations for React code.
 */
exports.CODE_TRANSLATIONS_FILE_NAME = 'code.json';
/** Dev server opens on this port by default. */
exports.DEFAULT_PORT = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;
/** Default plugin ID. */
exports.DEFAULT_PLUGIN_ID = 'default';
/**
 * Allow overriding the limit after which the url loader will no longer inline
 * assets.
 *
 * @see https://github.com/facebook/docusaurus/issues/5493
 */
exports.WEBPACK_URL_LOADER_LIMIT = process.env.WEBPACK_URL_LOADER_LIMIT ?? 10000;
//# sourceMappingURL=constants.js.map