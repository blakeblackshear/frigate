import type autoprefixer from 'autoprefixer';
import type { PluginCreator } from 'postcss';
import type { pluginOptions as pluginOptions_10 } from 'postcss-color-functional-notation';
import type { pluginOptions as pluginOptions_11 } from '@csstools/postcss-color-mix-function';
import type { pluginOptions as pluginOptions_12 } from '@csstools/postcss-color-mix-variadic-function-arguments';
import type { pluginOptions as pluginOptions_13 } from '@csstools/postcss-content-alt-text';
import type { pluginOptions as pluginOptions_14 } from '@csstools/postcss-contrast-color-function';
import type { pluginOptions as pluginOptions_15 } from 'postcss-custom-media';
import type { pluginOptions as pluginOptions_16 } from 'postcss-custom-properties';
import type { pluginOptions as pluginOptions_17 } from 'postcss-custom-selectors';
import type { pluginOptions as pluginOptions_18 } from 'postcss-dir-pseudo-class';
import type { pluginOptions as pluginOptions_19 } from '@csstools/postcss-normalize-display-values';
import type { pluginOptions as pluginOptions_2 } from '@csstools/postcss-initial';
import type { pluginOptions as pluginOptions_20 } from 'postcss-double-position-gradients';
import type { pluginOptions as pluginOptions_21 } from '@csstools/postcss-exponential-functions';
import type { pluginOptions as pluginOptions_22 } from '@csstools/postcss-logical-float-and-clear';
import type { pluginOptions as pluginOptions_23 } from 'postcss-focus-visible';
import type { pluginOptions as pluginOptions_24 } from 'postcss-focus-within';
import type { pluginOptions as pluginOptions_25 } from '@csstools/postcss-font-format-keywords';
import type { pluginOptions as pluginOptions_26 } from '@csstools/postcss-gamut-mapping';
import type { pluginOptions as pluginOptions_27 } from 'postcss-gap-properties';
import type { pluginOptions as pluginOptions_28 } from '@csstools/postcss-gradients-interpolation-method';
import type { pluginOptions as pluginOptions_29 } from 'css-has-pseudo';
import type { pluginOptions as pluginOptions_3 } from '@csstools/postcss-alpha-function';
import type { pluginOptions as pluginOptions_30 } from 'postcss-color-hex-alpha';
import type { pluginOptions as pluginOptions_31 } from '@csstools/postcss-hwb-function';
import type { pluginOptions as pluginOptions_32 } from '@csstools/postcss-ic-unit';
import type { pluginOptions as pluginOptions_33 } from 'postcss-image-set-function';
import type { pluginOptions as pluginOptions_34 } from '@csstools/postcss-is-pseudo-class';
import type { pluginOptions as pluginOptions_35 } from 'postcss-lab-function';
import type { pluginOptions as pluginOptions_36 } from '@csstools/postcss-light-dark-function';
import type { pluginOptions as pluginOptions_37 } from '@csstools/postcss-logical-overflow';
import type { pluginOptions as pluginOptions_38 } from '@csstools/postcss-logical-overscroll-behavior';
import type { pluginOptions as pluginOptions_39 } from 'postcss-logical';
import type { pluginOptions as pluginOptions_4 } from 'postcss-pseudo-class-any-link';
import type { pluginOptions as pluginOptions_40 } from '@csstools/postcss-logical-resize';
import type { pluginOptions as pluginOptions_41 } from '@csstools/postcss-logical-viewport-units';
import type { pluginOptions as pluginOptions_42 } from '@csstools/postcss-media-queries-aspect-ratio-number-values';
import type { pluginOptions as pluginOptions_43 } from '@csstools/postcss-media-minmax';
import type { pluginOptions as pluginOptions_44 } from '@csstools/postcss-nested-calc';
import type { pluginOptions as pluginOptions_45 } from 'postcss-nesting';
import type { pluginOptions as pluginOptions_46 } from 'postcss-selector-not';
import type { pluginOptions as pluginOptions_47 } from '@csstools/postcss-oklab-function';
import type { pluginOptions as pluginOptions_48 } from 'postcss-overflow-shorthand';
import type { pluginOptions as pluginOptions_49 } from 'postcss-place';
import type { pluginOptions as pluginOptions_5 } from 'css-blank-pseudo';
import type { pluginOptions as pluginOptions_50 } from 'css-prefers-color-scheme';
import type { pluginOptions as pluginOptions_51 } from '@csstools/postcss-random-function';
import type { pluginOptions as pluginOptions_52 } from 'postcss-color-rebeccapurple';
import type { pluginOptions as pluginOptions_53 } from '@csstools/postcss-relative-color-syntax';
import type { pluginOptions as pluginOptions_54 } from '@csstools/postcss-scope-pseudo-class';
import type { pluginOptions as pluginOptions_55 } from '@csstools/postcss-sign-functions';
import type { pluginOptions as pluginOptions_56 } from '@csstools/postcss-stepped-value-functions';
import type { pluginOptions as pluginOptions_57 } from '@csstools/postcss-text-decoration-shorthand';
import type { pluginOptions as pluginOptions_58 } from '@csstools/postcss-trigonometric-functions';
import type { pluginOptions as pluginOptions_59 } from '@csstools/postcss-unset-value';
import type { pluginOptions as pluginOptions_6 } from '@csstools/postcss-cascade-layers';
import type { pluginOptions as pluginOptions_7 } from 'postcss-attribute-case-insensitive';
import type { pluginOptions as pluginOptions_8 } from '@csstools/postcss-color-function';
import type { pluginOptions as pluginOptions_9 } from '@csstools/postcss-color-function-display-p3-linear';

declare const creator: PluginCreator<pluginOptions>;
export default creator;

export declare enum DirectionFlow {
    TopToBottom = "top-to-bottom",
    BottomToTop = "bottom-to-top",
    RightToLeft = "right-to-left",
    LeftToRight = "left-to-right"
}

export declare type pluginOptions = {
    /**
     * Determine which CSS features to polyfill,
     * based upon their process in becoming web standards.
     * default: 2
     */
    stage?: number | false;
    /**
     * Determine which CSS features to polyfill,
     * based their implementation status.
     * default: 0
     */
    minimumVendorImplementations?: number;
    /**
     * Enable any feature that would need an extra browser library to be loaded into the page for it to work.
     * default: false
     */
    enableClientSidePolyfills?: boolean;
    /**
     * PostCSS Preset Env supports any standard browserslist configuration,
     * which can be a `.browserslistrc` file,
     * a `browserslist` key in `package.json`,
     * or `browserslist` environment variables.
     *
     * The `env` option is used to select a specific browserslist environment in the event that you have more than one.
     */
    env?: string;
    /**
     * PostCSS Preset Env supports any standard browserslist configuration,
     * which can be a `.browserslistrc` file,
     * a `browserslist` key in `package.json`,
     * or `browserslist` environment variables.
     *
     * The `browsers` option should only be used when a standard browserslist configuration is not available.
     * When the `browsers` option is used the `env` option is ignored.
     */
    browsers?: string | Array<string> | null;
    /**
     * Determine whether all plugins should receive a `preserve` option,
     * which may preserve or remove the original and now polyfilled CSS.
     * Each plugin has it's own default, some true, others false.
     * default: _not set_
     */
    preserve?: boolean;
    /**
     * [Configure autoprefixer](https://github.com/postcss/autoprefixer#options)
     */
    autoprefixer?: autoprefixer.Options;
    /**
     * Enable or disable specific polyfills by ID.
     * Passing `true` to a specific [feature ID](https://github.com/csstools/postcss-plugins/blob/main/plugin-packs/postcss-preset-env/FEATURES.md) will enable its polyfill,
     * while passing `false` will disable it.
     *
     * Passing an object to a specific feature ID will both enable and configure it.
     */
    features?: pluginsOptions;
    /**
     * The `insertBefore` key allows you to insert other PostCSS plugins into the chain.
     * This is only useful if you are also using sugary PostCSS plugins that must execute before certain polyfills.
     * `insertBefore` supports chaining one or multiple plugins.
     */
    insertBefore?: Record<string, unknown>;
    /**
     * The `insertAfter` key allows you to insert other PostCSS plugins into the chain.
     * This is only useful if you are also using sugary PostCSS plugins that must execute after certain polyfills.
     * `insertAfter` supports chaining one or multiple plugins.
     */
    insertAfter?: Record<string, unknown>;
    /**
     * Enable debugging messages to stdout giving insights into which features have been enabled/disabled and why.
     * default: false
     */
    debug?: boolean;
    /**
     * The `logical` object allows to configure all plugins related to logical document flow at once.
     * It accepts the same options as each plugin: `inlineDirection` and `blockDirection`.
     */
    logical?: {
        /** Set the inline flow direction. default: left-to-right */
        inlineDirection?: DirectionFlow;
        /** Set the block flow direction. default: top-to-bottom */
        blockDirection?: DirectionFlow;
    };
};

export declare type pluginsOptions = {
    /** plugin options for "@csstools/postcss-initial" */
    'all-property'?: subPluginOptions<pluginOptions_2>;
    /** plugin options for "@csstools/postcss-alpha-function" */
    'alpha-function'?: subPluginOptions<pluginOptions_3>;
    /** plugin options for "postcss-pseudo-class-any-link" */
    'any-link-pseudo-class'?: subPluginOptions<pluginOptions_4>;
    /** plugin options for "css-blank-pseudo" */
    'blank-pseudo-class'?: subPluginOptions<pluginOptions_5>;
    /** plugin options for "postcss-page-break" */
    'break-properties'?: subPluginOptions<postcssPageBreakOptions>;
    /** plugin options for "@csstools/postcss-cascade-layers" */
    'cascade-layers'?: subPluginOptions<pluginOptions_6>;
    /** plugin options for "postcss-attribute-case-insensitive" */
    'case-insensitive-attributes'?: subPluginOptions<pluginOptions_7>;
    /** plugin options for "postcss-clamp" */
    'clamp'?: subPluginOptions<postcssClampOptions>;
    /** plugin options for "@csstools/postcss-color-function" */
    'color-function'?: subPluginOptions<pluginOptions_8>;
    /** plugin options for "@csstools/postcss-color-function-display-p3-linear" */
    'color-function-display-p3-linear'?: subPluginOptions<pluginOptions_9>;
    /** plugin options for "postcss-color-functional-notation" */
    'color-functional-notation'?: subPluginOptions<pluginOptions_10>;
    /** plugin options for "@csstools/postcss-color-mix-function" */
    'color-mix'?: subPluginOptions<pluginOptions_11>;
    /** plugin options for "@csstools/postcss-color-mix-variadic-function-arguments" */
    'color-mix-variadic-function-arguments'?: subPluginOptions<pluginOptions_12>;
    /** plugin options for "@csstools/postcss-content-alt-text" */
    'content-alt-text'?: subPluginOptions<pluginOptions_13>;
    /** plugin options for "@csstools/postcss-contrast-color-function" */
    'contrast-color-function'?: subPluginOptions<pluginOptions_14>;
    /** plugin options for "postcss-custom-media" */
    'custom-media-queries'?: subPluginOptions<pluginOptions_15>;
    /** plugin options for "postcss-custom-properties" */
    'custom-properties'?: subPluginOptions<pluginOptions_16>;
    /** plugin options for "postcss-custom-selectors" */
    'custom-selectors'?: subPluginOptions<pluginOptions_17>;
    /** plugin options for "postcss-dir-pseudo-class" */
    'dir-pseudo-class'?: subPluginOptions<pluginOptions_18>;
    /** plugin options for "@csstools/postcss-normalize-display-values" */
    'display-two-values'?: subPluginOptions<pluginOptions_19>;
    /** plugin options for "postcss-double-position-gradients" */
    'double-position-gradients'?: subPluginOptions<pluginOptions_20>;
    /** plugin options for "@csstools/postcss-exponential-functions" */
    'exponential-functions'?: subPluginOptions<pluginOptions_21>;
    /** plugin options for "@csstools/postcss-logical-float-and-clear" */
    'float-clear-logical-values'?: subPluginOptions<pluginOptions_22>;
    /** plugin options for "postcss-focus-visible" */
    'focus-visible-pseudo-class'?: subPluginOptions<pluginOptions_23>;
    /** plugin options for "postcss-focus-within" */
    'focus-within-pseudo-class'?: subPluginOptions<pluginOptions_24>;
    /** plugin options for "@csstools/postcss-font-format-keywords" */
    'font-format-keywords'?: subPluginOptions<pluginOptions_25>;
    /** plugin options for "postcss-font-variant" */
    'font-variant-property'?: subPluginOptions<postcssFontVariantOptions>;
    /** plugin options for "@csstools/postcss-gamut-mapping" */
    'gamut-mapping'?: subPluginOptions<pluginOptions_26>;
    /** plugin options for "postcss-gap-properties" */
    'gap-properties'?: subPluginOptions<pluginOptions_27>;
    /** plugin options for "@csstools/postcss-gradients-interpolation-method" */
    'gradients-interpolation-method'?: subPluginOptions<pluginOptions_28>;
    /** plugin options for "css-has-pseudo" */
    'has-pseudo-class'?: subPluginOptions<pluginOptions_29>;
    /** plugin options for "postcss-color-hex-alpha" */
    'hexadecimal-alpha-notation'?: subPluginOptions<pluginOptions_30>;
    /** plugin options for "@csstools/postcss-hwb-function" */
    'hwb-function'?: subPluginOptions<pluginOptions_31>;
    /** plugin options for "@csstools/postcss-ic-unit" */
    'ic-unit'?: subPluginOptions<pluginOptions_32>;
    /** plugin options for "postcss-image-set-function" */
    'image-set-function'?: subPluginOptions<pluginOptions_33>;
    /** plugin options for "@csstools/postcss-is-pseudo-class" */
    'is-pseudo-class'?: subPluginOptions<pluginOptions_34>;
    /** plugin options for "postcss-lab-function" */
    'lab-function'?: subPluginOptions<pluginOptions_35>;
    /** plugin options for "@csstools/postcss-light-dark-function" */
    'light-dark-function'?: subPluginOptions<pluginOptions_36>;
    /** plugin options for "@csstools/postcss-logical-overflow" */
    'logical-overflow'?: subPluginOptions<pluginOptions_37>;
    /** plugin options for "@csstools/postcss-logical-overscroll-behavior" */
    'logical-overscroll-behavior'?: subPluginOptions<pluginOptions_38>;
    /** plugin options for "postcss-logical" */
    'logical-properties-and-values'?: subPluginOptions<pluginOptions_39>;
    /** plugin options for "@csstools/postcss-logical-resize" */
    'logical-resize'?: subPluginOptions<pluginOptions_40>;
    /** plugin options for "@csstools/postcss-logical-viewport-units" */
    'logical-viewport-units'?: subPluginOptions<pluginOptions_41>;
    /** plugin options for "@csstools/postcss-media-queries-aspect-ratio-number-values" */
    'media-queries-aspect-ratio-number-values'?: subPluginOptions<pluginOptions_42>;
    /** plugin options for "@csstools/postcss-media-minmax" */
    'media-query-ranges'?: subPluginOptions<pluginOptions_43>;
    /** plugin options for "@csstools/postcss-nested-calc" */
    'nested-calc'?: subPluginOptions<pluginOptions_44>;
    /** plugin options for "postcss-nesting" */
    'nesting-rules'?: subPluginOptions<pluginOptions_45>;
    /** plugin options for "postcss-selector-not" */
    'not-pseudo-class'?: subPluginOptions<pluginOptions_46>;
    /** plugin options for "@csstools/postcss-oklab-function" */
    'oklab-function'?: subPluginOptions<pluginOptions_47>;
    /** plugin options for "postcss-opacity-percentage" */
    'opacity-percentage'?: subPluginOptions<postcssOpacityPercentageOptions>;
    /** plugin options for "postcss-overflow-shorthand" */
    'overflow-property'?: subPluginOptions<pluginOptions_48>;
    /** plugin options for "postcss-replace-overflow-wrap" */
    'overflow-wrap-property'?: subPluginOptions<postcssReplaceOverflowWrapOptions>;
    /** plugin options for "postcss-place" */
    'place-properties'?: subPluginOptions<pluginOptions_49>;
    /** plugin options for "css-prefers-color-scheme" */
    'prefers-color-scheme-query'?: subPluginOptions<pluginOptions_50>;
    /** plugin options for "@csstools/postcss-random-function" */
    'random-function'?: subPluginOptions<pluginOptions_51>;
    /** plugin options for "postcss-color-rebeccapurple" */
    'rebeccapurple-color'?: subPluginOptions<pluginOptions_52>;
    /** plugin options for "@csstools/postcss-relative-color-syntax" */
    'relative-color-syntax'?: subPluginOptions<pluginOptions_53>;
    /** plugin options for "@csstools/postcss-scope-pseudo-class" */
    'scope-pseudo-class'?: subPluginOptions<pluginOptions_54>;
    /** plugin options for "@csstools/postcss-sign-functions" */
    'sign-functions'?: subPluginOptions<pluginOptions_55>;
    /** plugin options for "@csstools/postcss-stepped-value-functions" */
    'stepped-value-functions'?: subPluginOptions<pluginOptions_56>;
    /** plugin options for "postcss-system-ui-font-family" */
    'system-ui-font-family'?: subPluginOptions<postcssFontFamilySystemUIOptions>;
    /** plugin options for "@csstools/postcss-text-decoration-shorthand" */
    'text-decoration-shorthand'?: subPluginOptions<pluginOptions_57>;
    /** plugin options for "@csstools/postcss-trigonometric-functions" */
    'trigonometric-functions'?: subPluginOptions<pluginOptions_58>;
    /** plugin options for "@csstools/postcss-unset-value" */
    'unset-value'?: subPluginOptions<pluginOptions_59>;
};

/** postcss-clamp plugin options */
export declare type postcssClampOptions = {
    /** Preserve the original notation. default: false */
    preserve?: boolean;
    /**
     * The precalculate option determines whether values with the same unit should be precalculated.
     * default: false
     */
    precalculate?: boolean;
};

/** postcss-system-ui-font-family plugin options */
export declare type postcssFontFamilySystemUIOptions = Record<string, never>;

/** postcss-font-variant plugin options */
export declare type postcssFontVariantOptions = Record<string, never>;

/** postcss-opacity-percentage plugin options */
export declare type postcssOpacityPercentageOptions = {
    /** Preserve the original notation. default: false */
    preserve?: boolean;
};

/** postcss-page-break plugin options */
export declare type postcssPageBreakOptions = Record<string, never>;

/** postcss-replace-overflow-wrap plugin options */
export declare type postcssReplaceOverflowWrapOptions = {
    /** Preserve the original notation. default: false */
    preserve?: boolean;
};

export declare type subPluginOptions<T> = ['auto' | boolean, T] | T | boolean;

export { }
