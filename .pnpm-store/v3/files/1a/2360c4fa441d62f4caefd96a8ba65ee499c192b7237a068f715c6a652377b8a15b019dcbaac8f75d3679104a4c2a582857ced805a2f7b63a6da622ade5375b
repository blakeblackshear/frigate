import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import { Effect } from 'effect';

import { ArrayFormatter, decodeUnknown } from 'effect/ParseResult';
import type { FieldErrors } from 'react-hook-form';
import type { Resolver } from './types';

export const effectTsResolver: Resolver =
  (schema, config = { errors: 'all', onExcessProperty: 'ignore' }) =>
  (values, _, options) => {
    return decodeUnknown(
      schema,
      config,
    )(values).pipe(
      Effect.catchAll((parseIssue) =>
        Effect.flip(ArrayFormatter.formatIssue(parseIssue)),
      ),
      Effect.mapError((issues) => {
        const errors = issues.reduce((acc, current) => {
          const key = current.path.join('.');
          acc[key] = { message: current.message, type: current._tag };
          return acc;
        }, {} as FieldErrors);

        return toNestErrors(errors, options);
      }),
      Effect.tap(() =>
        Effect.sync(
          () =>
            options.shouldUseNativeValidation &&
            validateFieldsNatively({}, options),
        ),
      ),
      Effect.match({
        onFailure: (errors) => ({ errors, values: {} }),
        onSuccess: (result) => ({ errors: {}, values: result }),
      }),
      Effect.runPromise,
    );
  };
