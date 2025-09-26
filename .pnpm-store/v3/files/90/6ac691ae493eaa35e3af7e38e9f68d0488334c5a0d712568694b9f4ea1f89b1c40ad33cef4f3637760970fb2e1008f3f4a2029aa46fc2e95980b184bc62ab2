import { Schema } from 'effect';
import { ParseOptions } from 'effect/SchemaAST';
import { FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';
export type Resolver = <A extends FieldValues, I, TContext>(schema: Schema.Schema<A, I>, config?: ParseOptions) => (values: FieldValues, _context: TContext | undefined, options: ResolverOptions<A>) => Promise<ResolverResult<A>>;
