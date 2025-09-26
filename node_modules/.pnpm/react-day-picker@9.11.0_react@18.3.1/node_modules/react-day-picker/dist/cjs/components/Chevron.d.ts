import React from "react";
/**
 * Render the chevron icon used in the navigation buttons and dropdowns.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export declare function Chevron(props: {
    className?: string;
    /**
     * The size of the chevron.
     *
     * @defaultValue 24
     */
    size?: number;
    /** Set to `true` to disable the chevron. */
    disabled?: boolean;
    /** The orientation of the chevron. */
    orientation?: "up" | "down" | "left" | "right";
}): React.JSX.Element;
export type ChevronProps = Parameters<typeof Chevron>[0];
