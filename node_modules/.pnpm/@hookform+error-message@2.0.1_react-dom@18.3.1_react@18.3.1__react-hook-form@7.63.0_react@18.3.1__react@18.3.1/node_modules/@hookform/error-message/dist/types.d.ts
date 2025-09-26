import React from 'react';
import { FieldName, Message, MultipleFieldErrors, FieldErrors } from 'react-hook-form';
declare type Assign<T extends object, U extends object> = T & Omit<U, keyof T>;
export declare type FieldValuesFromFieldErrors<TFieldErrors> = TFieldErrors extends FieldErrors<infer TFieldValues> ? TFieldValues : never;
declare type AsProps<TAs> = TAs extends undefined ? {} : TAs extends React.ReactElement ? Record<string, any> : TAs extends React.ComponentType<infer P> ? Omit<P, 'children'> : TAs extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[TAs] : never;
export declare type Props<TFieldErrors extends FieldErrors, TAs extends undefined | React.ReactElement | React.ComponentType<any> | keyof JSX.IntrinsicElements> = Assign<{
    as?: TAs;
    errors?: TFieldErrors;
    name: FieldName<FieldValuesFromFieldErrors<TFieldErrors>>;
    message?: Message;
    render?: (data: {
        message: Message;
        messages?: MultipleFieldErrors;
    }) => React.ReactNode;
}, AsProps<TAs>>;
export {};
