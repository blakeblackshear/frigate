import type { PluginCreator } from 'postcss';

declare const creator: PluginCreator<pluginOptions>;
export default creator;

export declare enum DirectionFlow {
    TopToBottom = "top-to-bottom",
    BottomToTop = "bottom-to-top",
    RightToLeft = "right-to-left",
    LeftToRight = "left-to-right"
}

/** postcss-logical plugin options */
export declare type pluginOptions = {
    /** Ignore logical properties with values containing `var()` */
    ignoreCustomProperties?: true;
    /** Sets the direction for block. default: top-to-bottom */
    blockDirection?: DirectionFlow;
    /** Sets the direction for inline. default: left-to-right */
    inlineDirection?: DirectionFlow;
};

export { }
