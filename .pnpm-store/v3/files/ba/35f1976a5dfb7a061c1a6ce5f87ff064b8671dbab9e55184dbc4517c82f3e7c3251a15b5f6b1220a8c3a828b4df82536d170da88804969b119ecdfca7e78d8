import React from 'react';

type ToastTypes = 'normal' | 'action' | 'success' | 'info' | 'warning' | 'error' | 'loading' | 'default';
type PromiseT<Data = any> = Promise<Data> | (() => Promise<Data>);
type PromiseTResult<Data = any> = string | React.ReactNode | ((data: Data) => React.ReactNode | string | Promise<React.ReactNode | string>);
type PromiseExternalToast = Omit<ExternalToast, 'description'>;
type PromiseData<ToastData = any> = PromiseExternalToast & {
    loading?: string | React.ReactNode;
    success?: PromiseTResult<ToastData>;
    error?: PromiseTResult;
    description?: PromiseTResult;
    finally?: () => void | Promise<void>;
};
interface ToastClassnames {
    toast?: string;
    title?: string;
    description?: string;
    loader?: string;
    closeButton?: string;
    cancelButton?: string;
    actionButton?: string;
    success?: string;
    error?: string;
    info?: string;
    warning?: string;
    loading?: string;
    default?: string;
    content?: string;
    icon?: string;
}
interface ToastIcons {
    success?: React.ReactNode;
    info?: React.ReactNode;
    warning?: React.ReactNode;
    error?: React.ReactNode;
    loading?: React.ReactNode;
    close?: React.ReactNode;
}
interface Action {
    label: React.ReactNode;
    onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    actionButtonStyle?: React.CSSProperties;
}
interface ToastT {
    id: number | string;
    title?: (() => React.ReactNode) | React.ReactNode;
    type?: ToastTypes;
    icon?: React.ReactNode;
    jsx?: React.ReactNode;
    richColors?: boolean;
    invert?: boolean;
    closeButton?: boolean;
    dismissible?: boolean;
    description?: (() => React.ReactNode) | React.ReactNode;
    duration?: number;
    delete?: boolean;
    action?: Action | React.ReactNode;
    cancel?: Action | React.ReactNode;
    onDismiss?: (toast: ToastT) => void;
    onAutoClose?: (toast: ToastT) => void;
    promise?: PromiseT;
    cancelButtonStyle?: React.CSSProperties;
    actionButtonStyle?: React.CSSProperties;
    style?: React.CSSProperties;
    unstyled?: boolean;
    className?: string;
    classNames?: ToastClassnames;
    descriptionClassName?: string;
    position?: Position;
}
type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
interface ToastOptions {
    className?: string;
    closeButton?: boolean;
    descriptionClassName?: string;
    style?: React.CSSProperties;
    cancelButtonStyle?: React.CSSProperties;
    actionButtonStyle?: React.CSSProperties;
    duration?: number;
    unstyled?: boolean;
    classNames?: ToastClassnames;
}
type Offset = {
    top?: string | number;
    right?: string | number;
    bottom?: string | number;
    left?: string | number;
} | string | number;
interface ToasterProps {
    invert?: boolean;
    theme?: 'light' | 'dark' | 'system';
    position?: Position;
    hotkey?: string[];
    richColors?: boolean;
    expand?: boolean;
    duration?: number;
    gap?: number;
    visibleToasts?: number;
    closeButton?: boolean;
    toastOptions?: ToastOptions;
    className?: string;
    style?: React.CSSProperties;
    offset?: Offset;
    mobileOffset?: Offset;
    dir?: 'rtl' | 'ltr' | 'auto';
    swipeDirections?: SwipeDirection[];
    /**
     * @deprecated Please use the `icons` prop instead:
     * ```jsx
     * <Toaster
     *   icons={{ loading: <LoadingIcon /> }}
     * />
     * ```
     */
    loadingIcon?: React.ReactNode;
    icons?: ToastIcons;
    containerAriaLabel?: string;
    pauseWhenPageIsHidden?: boolean;
}
type SwipeDirection = 'top' | 'right' | 'bottom' | 'left';
interface ToastToDismiss {
    id: number | string;
    dismiss: boolean;
}
type ExternalToast = Omit<ToastT, 'id' | 'type' | 'title' | 'jsx' | 'delete' | 'promise'> & {
    id?: number | string;
};

type titleT = (() => React.ReactNode) | React.ReactNode;
declare const toast: ((message: titleT, data?: ExternalToast) => string | number) & {
    success: (message: titleT | React.ReactNode, data?: ExternalToast) => string | number;
    info: (message: titleT | React.ReactNode, data?: ExternalToast) => string | number;
    warning: (message: titleT | React.ReactNode, data?: ExternalToast) => string | number;
    error: (message: titleT | React.ReactNode, data?: ExternalToast) => string | number;
    custom: (jsx: (id: number | string) => React.ReactElement, data?: ExternalToast) => string | number;
    message: (message: titleT | React.ReactNode, data?: ExternalToast) => string | number;
    promise: <ToastData>(promise: PromiseT<ToastData>, data?: PromiseData<ToastData>) => (string & {
        unwrap: () => Promise<ToastData>;
    }) | (number & {
        unwrap: () => Promise<ToastData>;
    }) | {
        unwrap: () => Promise<ToastData>;
    };
    dismiss: (id?: number | string) => string | number;
    loading: (message: titleT | React.ReactNode, data?: ExternalToast) => string | number;
} & {
    getHistory: () => (ToastT | ToastToDismiss)[];
    getToasts: () => (ToastT | ToastToDismiss)[];
};

declare function useSonner(): {
    toasts: ToastT[];
};
declare const Toaster: React.ForwardRefExoticComponent<ToasterProps & React.RefAttributes<HTMLElement>>;

export { Action, ExternalToast, ToastClassnames, ToastT, ToastToDismiss, Toaster, ToasterProps, toast, useSonner };
