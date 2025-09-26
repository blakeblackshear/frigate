import type { FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';
import { AnyStrictValidator, ValidationState } from 'typanion';
type ValidateOptions = Pick<ValidationState, 'coercions' | 'coercion'>;
type RHFResolver = <TFieldValues extends FieldValues, TContext>(values: TFieldValues, context: TContext | undefined, options: ResolverOptions<TFieldValues>) => ResolverResult<TFieldValues>;
export type Resolver = <UnknownValidator extends AnyStrictValidator>(validator: UnknownValidator, validatorOptions?: ValidateOptions, resolverOptions?: {
    mode?: 'async' | 'sync';
    rawValues?: boolean;
}) => RHFResolver;
export {};
