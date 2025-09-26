import React from 'react';

type DocSearchTheme = 'dark' | 'light';

interface KeyboardShortcuts {
    /**
     * Enable/disable the Ctrl/Cmd+K shortcut to toggle the search modal.
     *
     * @default true
     */
    'Ctrl/Cmd+K'?: boolean;
    /**
     * Enable/disable the / shortcut to open the search modal.
     *
     * @default true
     */
    '/'?: boolean;
}

type ButtonTranslations = Partial<{
    buttonText: string;
    buttonAriaLabel: string;
}>;
type DocSearchButtonProps = React.ComponentProps<'button'> & {
    theme?: DocSearchTheme;
    translations?: ButtonTranslations;
    keyboardShortcuts?: KeyboardShortcuts;
};
declare const DocSearchButton: React.ForwardRefExoticComponent<Omit<DocSearchButtonProps, "ref"> & React.RefAttributes<HTMLButtonElement>>;

export { DocSearchButton };
export type { ButtonTranslations, DocSearchButtonProps };
