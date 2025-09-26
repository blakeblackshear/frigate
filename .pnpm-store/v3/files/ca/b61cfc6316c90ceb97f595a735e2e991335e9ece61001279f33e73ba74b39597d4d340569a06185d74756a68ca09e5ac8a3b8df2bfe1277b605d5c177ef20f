import { Type } from '@sinclair/typebox';
import type { TypeCheck } from '@sinclair/typebox/compiler';
import { FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';
export type Resolver = <T extends ReturnType<typeof Type.Object>>(schema: T | TypeCheck<T>) => <TFieldValues extends FieldValues, TContext>(values: TFieldValues, context: TContext | undefined, options: ResolverOptions<TFieldValues>) => Promise<ResolverResult<TFieldValues>>;
