import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import * as Either from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import errorsToRecord from './errorsToRecord';
import { Resolver } from './types';

export const ioTsResolver: Resolver = (codec) => (values, _context, options) =>
  pipe(
    values,
    codec.decode,
    Either.mapLeft(
      errorsToRecord(
        !options.shouldUseNativeValidation && options.criteriaMode === 'all',
      ),
    ),
    Either.mapLeft((errors) => toNestErrors(errors, options)),
    Either.fold(
      (errors) => ({
        values: {},
        errors,
      }),
      (values) => {
        options.shouldUseNativeValidation &&
          validateFieldsNatively({}, options);

        return {
          values,
          errors: {},
        } as any;
      },
    ),
  );
