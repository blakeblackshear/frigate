import { VineValidator } from '@vinejs/vine';
import { ValidationOptions } from '@vinejs/vine/build/src/types';
import { FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';
export type Resolver = <T extends VineValidator<any, any>>(schema: T, schemaOptions?: ValidationOptions<any>, resolverOptions?: {
    raw?: boolean;
}) => <TFieldValues extends FieldValues, TContext>(values: TFieldValues, context: TContext | undefined, options: ResolverOptions<TFieldValues>) => Promise<ResolverResult<TFieldValues>>;
