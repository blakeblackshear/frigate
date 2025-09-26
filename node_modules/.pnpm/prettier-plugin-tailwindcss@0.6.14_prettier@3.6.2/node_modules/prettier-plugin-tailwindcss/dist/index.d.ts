import { SupportOption, Printer, Parser } from 'prettier';

declare const options: Record<string, SupportOption>;

declare const printers: Record<string, Printer>;
declare const parsers: Record<string, Parser>;
interface PluginOptions {
    /**
     * Path to the Tailwind config file.
     */
    tailwindConfig?: string;
    /**
     * Path to the CSS stylesheet used by Tailwind CSS (v4+)
     */
    tailwindStylesheet?: string;
    /**
     * Path to the CSS stylesheet used by Tailwind CSS (v4+)
     *
     * @deprecated Use `tailwindStylesheet` instead
     */
    tailwindEntryPoint?: string;
    /**
     * List of custom function and tag names that contain classes.
     */
    tailwindFunctions?: string[];
    /**
     * List of custom attributes that contain classes.
     */
    tailwindAttributes?: string[];
    /**
     * Preserve whitespace around Tailwind classes when sorting.
     */
    tailwindPreserveWhitespace?: boolean;
    /**
     * Preserve duplicate classes inside a class list when sorting.
     */
    tailwindPreserveDuplicates?: boolean;
}
declare module 'prettier' {
    interface RequiredOptions extends PluginOptions {
    }
    interface ParserOptions extends PluginOptions {
    }
}

export { type PluginOptions, options, parsers, printers };
