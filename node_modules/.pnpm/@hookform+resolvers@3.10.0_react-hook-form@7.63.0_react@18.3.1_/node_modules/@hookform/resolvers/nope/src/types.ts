import type { NopeObject } from 'nope-validator/lib/cjs/NopeObject';
import type {
  FieldValues,
  ResolverOptions,
  ResolverResult,
} from 'react-hook-form';

type ValidateOptions = Parameters<NopeObject['validate']>[2];
type Context = Parameters<NopeObject['validate']>[1];

export type Resolver = <T extends NopeObject>(
  schema: T,
  schemaOptions?: ValidateOptions,
  resolverOptions?: { mode?: 'async' | 'sync'; rawValues?: boolean },
) => <TFieldValues extends FieldValues, TContext extends Context>(
  values: TFieldValues,
  context: TContext | undefined,
  options: ResolverOptions<TFieldValues>,
) => ResolverResult<TFieldValues>;
