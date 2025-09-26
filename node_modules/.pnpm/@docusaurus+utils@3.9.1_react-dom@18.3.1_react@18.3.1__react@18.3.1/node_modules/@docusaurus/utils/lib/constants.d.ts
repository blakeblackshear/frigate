/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/** Node major version, directly read from env. */
export declare const NODE_MAJOR_VERSION: number;
/** Node minor version, directly read from env. */
export declare const NODE_MINOR_VERSION: number;
/** Docusaurus core version. */
export declare const DOCUSAURUS_VERSION: string;
/**
 * Can be overridden with cli option `--out-dir`. Code should generally use
 * `context.outDir` instead (which is always absolute and localized).
 */
export declare const DEFAULT_BUILD_DIR_NAME = "build";
/**
 * Can be overridden with cli option `--config`. Code should generally use
 * `context.siteConfigPath` instead (which is always absolute).
 *
 * This does not have extensions, so that we can substitute different ones
 * when resolving the path.
 */
export declare const DEFAULT_CONFIG_FILE_NAME = "docusaurus.config";
/** Can be absolute or relative to site directory. */
export declare const BABEL_CONFIG_FILE_NAME: string;
/**
 * Can be absolute or relative to site directory. Code should generally use
 * `context.generatedFilesDir` instead (which is always absolute).
 */
export declare const GENERATED_FILES_DIR_NAME: string;
/**
 * We would assume all of the site's JS code lives in here and not outside.
 * Relative to the site directory.
 */
export declare const SRC_DIR_NAME = "src";
/**
 * Can be overridden with `config.staticDirectories`. Code should use
 * `context.siteConfig.staticDirectories` instead (which is always absolute).
 */
export declare const DEFAULT_STATIC_DIR_NAME = "static";
/**
 * Files here are handled by webpack, hashed (can be cached aggressively).
 * Relative to the build output folder.
 */
export declare const OUTPUT_STATIC_ASSETS_DIR_NAME = "assets";
/**
 * Components in this directory will receive the `@theme` alias and be able to
 * shadow default theme components.
 */
export declare const THEME_PATH = "src/theme";
/**
 * All translation-related data live here, relative to site directory. Content
 * will be namespaced by locale.
 */
export declare const DEFAULT_I18N_DIR_NAME = "i18n";
/**
 * Translations for React code.
 */
export declare const CODE_TRANSLATIONS_FILE_NAME = "code.json";
/** Dev server opens on this port by default. */
export declare const DEFAULT_PORT: number;
/** Default plugin ID. */
export declare const DEFAULT_PLUGIN_ID = "default";
/**
 * Allow overriding the limit after which the url loader will no longer inline
 * assets.
 *
 * @see https://github.com/facebook/docusaurus/issues/5493
 */
export declare const WEBPACK_URL_LOADER_LIMIT: string | number;
//# sourceMappingURL=constants.d.ts.map