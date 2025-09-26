import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import type { ShapeErrors } from 'nope-validator/lib/cjs/types';
import type { FieldError, FieldErrors } from 'react-hook-form';
import type { Resolver } from './types';

const parseErrors = (
  errors: ShapeErrors,
  parsedErrors: FieldErrors = {},
  path = '',
) => {
  return Object.keys(errors).reduce((acc, key) => {
    const _path = path ? `${path}.${key}` : key;
    const error = errors[key];

    if (typeof error === 'string') {
      acc[_path] = {
        message: error,
      } as FieldError;
    } else {
      parseErrors(error, acc, _path);
    }

    return acc;
  }, parsedErrors);
};

export const nopeResolver: Resolver =
  (
    schema,
    schemaOptions = {
      abortEarly: false,
    },
  ) =>
  (values, context, options) => {
    const result = schema.validate(values, context, schemaOptions) as
      | ShapeErrors
      | undefined;

    if (result) {
      return { values: {}, errors: toNestErrors(parseErrors(result), options) };
    }

    options.shouldUseNativeValidation && validateFieldsNatively({}, options);

    return { values, errors: {} };
  };
