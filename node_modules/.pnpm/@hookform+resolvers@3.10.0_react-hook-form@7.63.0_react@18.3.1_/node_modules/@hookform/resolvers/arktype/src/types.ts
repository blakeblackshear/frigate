import { Type } from 'arktype';
import { FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';

export type Resolver = <T extends Type<any>>(
  schema: T,
  schemaOptions?: undefined,
  factoryOptions?: {
    /**
     * Return the raw input values rather than the parsed values.
     * @default false
     */
    raw?: boolean;
  },
) => <TFieldValues extends FieldValues, TContext>(
  values: TFieldValues,
  context: TContext | undefined,
  options: ResolverOptions<TFieldValues>,
) => ResolverResult<TFieldValues>;
