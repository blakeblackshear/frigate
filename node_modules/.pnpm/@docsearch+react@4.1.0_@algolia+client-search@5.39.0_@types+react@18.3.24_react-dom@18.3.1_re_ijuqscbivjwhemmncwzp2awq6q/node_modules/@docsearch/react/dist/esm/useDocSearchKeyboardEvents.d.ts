import React from 'react';

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

interface UseDocSearchKeyboardEventsProps {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onInput?: (event: KeyboardEvent) => void;
    searchButtonRef: React.RefObject<HTMLButtonElement | null>;
    isAskAiActive: boolean;
    onAskAiToggle: (toggle: boolean) => void;
    keyboardShortcuts?: KeyboardShortcuts;
}
declare function useDocSearchKeyboardEvents({ isOpen, onOpen, onClose, onInput, isAskAiActive, onAskAiToggle, searchButtonRef, keyboardShortcuts, }: UseDocSearchKeyboardEventsProps): void;

export { useDocSearchKeyboardEvents };
export type { UseDocSearchKeyboardEventsProps };
