import { ClassConstructor, ClassTransformOptions } from 'class-transformer';
import { ValidatorOptions } from 'class-validator';
import { FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';
export type Resolver = <T extends {
    [_: string]: any;
}>(schema: ClassConstructor<T>, schemaOptions?: {
    validator?: ValidatorOptions;
    transformer?: ClassTransformOptions;
}, resolverOptions?: {
    mode?: 'async' | 'sync';
    rawValues?: boolean;
}) => <TFieldValues extends FieldValues, TContext>(values: TFieldValues, context: TContext | undefined, options: ResolverOptions<TFieldValues>) => Promise<ResolverResult<TFieldValues>>;
