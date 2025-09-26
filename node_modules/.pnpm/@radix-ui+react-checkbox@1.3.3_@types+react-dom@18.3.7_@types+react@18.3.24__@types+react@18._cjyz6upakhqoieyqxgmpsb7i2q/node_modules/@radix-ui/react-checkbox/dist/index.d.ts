import * as react_jsx_runtime from 'react/jsx-runtime';
import * as _radix_ui_react_context from '@radix-ui/react-context';
import { Scope } from '@radix-ui/react-context';
import * as React from 'react';
import { Primitive } from '@radix-ui/react-primitive';

type ScopedProps<P> = P & {
    __scopeCheckbox?: Scope;
};
declare const createCheckboxScope: _radix_ui_react_context.CreateScope;
type CheckedState = boolean | 'indeterminate';
interface CheckboxProviderProps<State extends CheckedState = CheckedState> {
    checked?: State | boolean;
    defaultChecked?: State | boolean;
    required?: boolean;
    onCheckedChange?(checked: State | boolean): void;
    name?: string;
    form?: string;
    disabled?: boolean;
    value?: string | number | readonly string[];
    children?: React.ReactNode;
}
declare function CheckboxProvider<State extends CheckedState = CheckedState>(props: ScopedProps<CheckboxProviderProps<State>>): react_jsx_runtime.JSX.Element;
interface CheckboxTriggerProps extends Omit<React.ComponentPropsWithoutRef<typeof Primitive.button>, keyof CheckboxProviderProps> {
    children?: React.ReactNode;
}
declare const CheckboxTrigger: React.ForwardRefExoticComponent<CheckboxTriggerProps & React.RefAttributes<HTMLButtonElement>>;
type PrimitiveButtonProps = React.ComponentPropsWithoutRef<typeof Primitive.button>;
interface CheckboxProps extends Omit<PrimitiveButtonProps, 'checked' | 'defaultChecked'> {
    checked?: CheckedState;
    defaultChecked?: CheckedState;
    required?: boolean;
    onCheckedChange?(checked: CheckedState): void;
}
declare const Checkbox: React.ForwardRefExoticComponent<CheckboxProps & React.RefAttributes<HTMLButtonElement>>;
type PrimitiveSpanProps = React.ComponentPropsWithoutRef<typeof Primitive.span>;
interface CheckboxIndicatorProps extends PrimitiveSpanProps {
    /**
     * Used to force mounting when more control is needed. Useful when
     * controlling animation with React animation libraries.
     */
    forceMount?: true;
}
declare const CheckboxIndicator: React.ForwardRefExoticComponent<CheckboxIndicatorProps & React.RefAttributes<HTMLSpanElement>>;
type InputProps = React.ComponentPropsWithoutRef<typeof Primitive.input>;
interface CheckboxBubbleInputProps extends Omit<InputProps, 'checked'> {
}
declare const CheckboxBubbleInput: React.ForwardRefExoticComponent<CheckboxBubbleInputProps & React.RefAttributes<HTMLInputElement>>;

export { Checkbox, CheckboxIndicator, type CheckboxIndicatorProps, type CheckboxProps, type CheckedState, CheckboxIndicator as Indicator, Checkbox as Root, createCheckboxScope, CheckboxBubbleInput as unstable_BubbleInput, CheckboxBubbleInput as unstable_CheckboxBubbleInput, type CheckboxBubbleInputProps as unstable_CheckboxBubbleInputProps, CheckboxProvider as unstable_CheckboxProvider, type CheckboxProviderProps as unstable_CheckboxProviderProps, CheckboxTrigger as unstable_CheckboxTrigger, type CheckboxTriggerProps as unstable_CheckboxTriggerProps, CheckboxProvider as unstable_Provider, CheckboxTrigger as unstable_Trigger };
