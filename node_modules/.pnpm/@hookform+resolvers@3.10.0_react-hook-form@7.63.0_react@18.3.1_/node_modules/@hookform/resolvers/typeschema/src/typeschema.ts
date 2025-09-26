import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import type { ValidationIssue } from '@typeschema/core';
import { validate } from '@typeschema/main';
import { FieldError, FieldErrors, appendErrors } from 'react-hook-form';
import type { Resolver } from './types';

const parseErrorSchema = (
  typeschemaErrors: ValidationIssue[],
  validateAllFieldCriteria: boolean,
): FieldErrors => {
  const errors: Record<string, FieldError> = {};

  for (; typeschemaErrors.length; ) {
    const error = typeschemaErrors[0];

    if (!error.path) {
      continue;
    }
    const _path = error.path.join('.');

    if (!errors[_path]) {
      errors[_path] = { message: error.message, type: '' };
    }

    if (validateAllFieldCriteria) {
      const types = errors[_path].types;
      const messages = types && types[''];

      errors[_path] = appendErrors(
        _path,
        validateAllFieldCriteria,
        errors,
        '',
        messages
          ? ([] as string[]).concat(messages as string[], error.message)
          : error.message,
      ) as FieldError;
    }

    typeschemaErrors.shift();
  }

  return errors;
};

export const typeschemaResolver: Resolver =
  (schema, _, resolverOptions = {}) =>
  async (values, _, options) => {
    const result = await validate(schema, values);

    options.shouldUseNativeValidation && validateFieldsNatively({}, options);

    if (result.success) {
      return {
        errors: {} as FieldErrors,
        values: resolverOptions.raw ? values : (result.data as any),
      };
    }

    return {
      values: {},
      errors: toNestErrors(
        parseErrorSchema(
          result.issues,
          !options.shouldUseNativeValidation && options.criteriaMode === 'all',
        ),
        options,
      ),
    };
  };
