/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext, Props, PluginIdentifier } from '@docusaurus/types';
export type LoadContextParams = {
    /** Usually the CWD; can be overridden with command argument. */
    siteDir: string;
    /** Custom output directory. Can be customized with `--out-dir` option */
    outDir?: string;
    /** Custom config path. Can be customized with `--config` option */
    config?: string;
    /** Default is `i18n.defaultLocale` */
    locale?: string;
    /**
     * By default, we try to automatically infer a localized baseUrl.
     * We prepend `/<siteBaseUrl>/` with a `/<locale>/` path segment,
     * except for the default locale.
     *
     * This option permits opting out of this baseUrl localization process.
     * It is mostly useful to simplify config for multi-domain i18n deployments.
     * See https://docusaurus.io/docs/i18n/tutorial#multi-domain-deployment
     *
     * In all cases, this process doesn't happen if an explicit localized baseUrl
     * has been provided using `i18n.localeConfigs[].baseUrl`. We always use the
     * provided value over the inferred one, letting you override it.
     */
    automaticBaseUrlLocalizationDisabled?: boolean;
};
export type LoadSiteParams = LoadContextParams & {
    isReload?: boolean;
};
export type Site = {
    props: Props;
    params: LoadSiteParams;
};
/**
 * Loading context is the very first step in site building. Its params are
 * directly acquired from CLI options. It mainly loads `siteConfig` and the i18n
 * context (which includes code translations). The `LoadContext` will be passed
 * to plugin constructors.
 */
export declare function loadContext(params: LoadContextParams): Promise<LoadContext>;
/**
 * This is the crux of the Docusaurus server-side. It reads everything it needs—
 * code translations, config file, plugin modules... Plugins then use their
 * lifecycles to generate content and other data. It is side-effect-ful because
 * it generates temp files in the `.docusaurus` folder for the bundler.
 */
export declare function loadSite(params: LoadSiteParams): Promise<Site>;
export declare function reloadSite(site: Site): Promise<Site>;
export declare function reloadSitePlugin(site: Site, pluginIdentifier: PluginIdentifier): Promise<Site>;
