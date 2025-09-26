import { FieldErrors, FieldValues, ResolverOptions } from 'react-hook-form';
export declare const toNestErrors: <TFieldValues extends FieldValues>(errors: FieldErrors, options: ResolverOptions<TFieldValues>) => FieldErrors<TFieldValues>;
