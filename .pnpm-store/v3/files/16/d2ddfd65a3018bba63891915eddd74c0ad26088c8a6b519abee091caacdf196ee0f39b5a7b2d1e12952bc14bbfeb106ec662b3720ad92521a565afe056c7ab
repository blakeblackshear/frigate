export type VariantOverride = {
    /**
     * - The variant name as it appears in the utitlity
     */
    variant: string;
    /**
     * - The format for non-scrollbar utilities
     */
    defaultFormat: string;
    /**
     * - The format for scrollbar utilities
     */
    scrollbarFormat: string;
};
/**
 * Modifies the way variant utilities are generated for scrollbars.
 *
 * Tailwind isn't very good at styling arbitrary pseudo classes of pseudo
 * elements, so scrollbar colour classes keep track of a default, hover, and
 * active state and use the cascade to determine which one to use. Instead of
 * trying to style a pseudo class, scrollbar utilities modify the name of the
 * property that is being applied and apply directly to the original class.
 *
 * @param {typedefs.TailwindPlugin} tailwind - Tailwind's plugin object
 */
export function addVariantOverrides({ addVariant, config }: typedefs.TailwindPlugin): void;
import typedefs = require("./typedefs");
