import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import type { FieldError, FieldErrors } from 'react-hook-form';
import type { Resolver } from './types';

const parseErrors = (errors: string[], parsedErrors: FieldErrors = {}) => {
  return errors.reduce((acc, error) => {
    const fieldIndex = error.indexOf(':');

    const field = error.slice(1, fieldIndex);
    const message = error.slice(fieldIndex + 1).trim();

    acc[field] = {
      message,
    } as FieldError;

    return acc;
  }, parsedErrors);
};

export const typanionResolver: Resolver =
  (validator, validatorOptions = {}) =>
  (values, _, options) => {
    const rawErrors: string[] = [];
    const isValid = validator(
      values,
      Object.assign(
        {},
        {
          errors: rawErrors,
        },
        validatorOptions,
      ),
    );
    const parsedErrors = parseErrors(rawErrors);

    if (isValid) {
      options.shouldUseNativeValidation &&
        validateFieldsNatively(parsedErrors, options);

      return { values, errors: {} };
    }

    return { values: {}, errors: toNestErrors(parsedErrors, options) };
  };
