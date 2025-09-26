import type { MermaidConfig } from './config.type.js';
export declare const defaultConfig: MermaidConfig;
export declare const updateCurrentConfig: (siteCfg: MermaidConfig, _directives: MermaidConfig[]) => MermaidConfig;
/**
 * ## setSiteConfig
 *
 * | Function      | Description                           | Type        | Values                                  |
 * | ------------- | ------------------------------------- | ----------- | --------------------------------------- |
 * | setSiteConfig | Sets the siteConfig to desired values | Put Request | Any Values, except ones in secure array |
 *
 * **Notes:** Sets the siteConfig. The siteConfig is a protected configuration for repeat use. Calls
 * to reset() will reset the currentConfig to siteConfig. Calls to reset(configApi.defaultConfig)
 * will reset siteConfig and currentConfig to the defaultConfig Note: currentConfig is set in this
 * function _Default value: At default, will mirror Global Config_
 *
 * @param conf - The base currentConfig to use as siteConfig
 * @returns The new siteConfig
 */
export declare const setSiteConfig: (conf: MermaidConfig) => MermaidConfig;
export declare const saveConfigFromInitialize: (conf: MermaidConfig) => void;
export declare const updateSiteConfig: (conf: MermaidConfig) => MermaidConfig;
/**
 * ## getSiteConfig
 *
 * | Function      | Description                                       | Type        | Values                           |
 * | ------------- | ------------------------------------------------- | ----------- | -------------------------------- |
 * | setSiteConfig | Returns the current siteConfig base configuration | Get Request | Returns Any Values in siteConfig |
 *
 * **Notes**: Returns **any** values in siteConfig.
 *
 * @returns The siteConfig
 */
export declare const getSiteConfig: () => MermaidConfig;
/**
 * ## setConfig
 *
 * | Function      | Description                           | Type        | Values                                  |
 * | ------------- | ------------------------------------- | ----------- | --------------------------------------- |
 * | setSiteConfig | Sets the siteConfig to desired values | Put Request | Any Values, except ones in secure array |
 *
 * **Notes**: Sets the currentConfig. The parameter conf is sanitized based on the siteConfig.secure
 * keys. Any values found in conf with key found in siteConfig.secure will be replaced with the
 * corresponding siteConfig value.
 *
 * @param conf - The potential currentConfig
 * @returns The currentConfig merged with the sanitized conf
 */
export declare const setConfig: (conf: MermaidConfig) => MermaidConfig;
/**
 * ## getConfig
 *
 * | Function  | Description               | Type        | Return Values                  |
 * | --------- | ------------------------- | ----------- | ------------------------------ |
 * | getConfig | Obtains the currentConfig | Get Request | Any Values from current Config |
 *
 * **Notes**: Avoid calling this function repeatedly. Instead, store the result in a variable and use it, and pass it down to function calls.
 *
 * @returns The currentConfig
 */
export declare const getConfig: () => MermaidConfig;
/**
 * ## sanitize
 *
 * | Function | Description                            | Type        | Values |
 * | -------- | -------------------------------------- | ----------- | ------ |
 * | sanitize | Sets the siteConfig to desired values. | Put Request | None   |
 *
 * Ensures options parameter does not attempt to override siteConfig secure keys **Notes**: modifies
 * options in-place
 *
 * @param options - The potential setConfig parameter
 */
export declare const sanitize: (options: any) => void;
/**
 * Pushes in a directive to the configuration
 *
 * @param directive - The directive to push in
 */
export declare const addDirective: (directive: MermaidConfig) => void;
/**
 * ## reset
 *
 * | Function | Description                  | Type        | Required | Values |
 * | -------- | ---------------------------- | ----------- | -------- | ------ |
 * | reset    | Resets currentConfig to conf | Put Request | Required | None   |
 *
 * ## conf
 *
 * | Parameter | Description                                                    | Type       | Required | Values                                       |
 * | --------- | -------------------------------------------------------------- | ---------- | -------- | -------------------------------------------- |
 * | conf      | base set of values, which currentConfig could be **reset** to. | Dictionary | Required | Any Values, with respect to the secure Array |
 *
 * **Notes**: (default: current siteConfig ) (optional, default `getSiteConfig()`)
 *
 * @param config - base set of values, which currentConfig could be **reset** to.
 * Defaults to the current siteConfig (e.g returned by {@link getSiteConfig}).
 */
export declare const reset: (config?: MermaidConfig) => void;
export declare const getUserDefinedConfig: () => MermaidConfig;
