import { FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';
import { BaseIssue, BaseSchema, BaseSchemaAsync, Config, InferIssue } from 'valibot';
export type Resolver = <T extends BaseSchema<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>>(schema: T, schemaOptions?: Partial<Omit<Config<InferIssue<T>>, 'abortPipeEarly' | 'skipPipe'>>, resolverOptions?: {
    /**
     * @default async
     */
    mode?: 'sync' | 'async';
    /**
     * Return the raw input values rather than the parsed values.
     * @default false
     */
    raw?: boolean;
}) => <TFieldValues extends FieldValues, TContext>(values: TFieldValues, context: TContext | undefined, options: ResolverOptions<TFieldValues>) => Promise<ResolverResult<TFieldValues>>;
