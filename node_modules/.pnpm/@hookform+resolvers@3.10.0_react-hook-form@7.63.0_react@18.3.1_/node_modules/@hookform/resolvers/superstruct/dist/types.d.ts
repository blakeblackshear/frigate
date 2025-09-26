import { FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';
import { Struct, validate } from 'superstruct';
type Options = Parameters<typeof validate>[2];
export type Resolver = <T extends Struct<any, any>>(schema: T, options?: Options, factoryOptions?: {
    /**
     * Return the raw input values rather than the parsed values.
     * @default false
     */
    raw?: boolean;
}) => <TFieldValues extends FieldValues, TContext>(values: TFieldValues, context: TContext | undefined, options: ResolverOptions<TFieldValues>) => ResolverResult<TFieldValues>;
export {};
