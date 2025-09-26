import type { AsyncValidationOptions, Schema } from 'joi';
import { FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';

export type Resolver = <T extends Schema>(
  schema: T,
  schemaOptions?: AsyncValidationOptions,
  factoryOptions?: { mode?: 'async' | 'sync' },
) => <TFieldValues extends FieldValues, TContext>(
  values: TFieldValues,
  context: TContext | undefined,
  options: ResolverOptions<TFieldValues>,
) => Promise<ResolverResult<TFieldValues>>;
