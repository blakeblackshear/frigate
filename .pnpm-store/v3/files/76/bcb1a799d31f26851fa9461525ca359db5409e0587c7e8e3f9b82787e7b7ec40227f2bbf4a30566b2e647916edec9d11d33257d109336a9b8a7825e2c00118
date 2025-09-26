import * as t from 'io-ts';
import { FieldError, FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';
export type Resolver = <T, TFieldValues extends FieldValues, TContext>(codec: t.Decoder<FieldValues, T>) => (values: TFieldValues, _context: TContext | undefined, options: ResolverOptions<TFieldValues>) => ResolverResult<TFieldValues>;
export type ErrorObject = Record<string, FieldError>;
export type FieldErrorWithPath = FieldError & {
    path: string;
};
