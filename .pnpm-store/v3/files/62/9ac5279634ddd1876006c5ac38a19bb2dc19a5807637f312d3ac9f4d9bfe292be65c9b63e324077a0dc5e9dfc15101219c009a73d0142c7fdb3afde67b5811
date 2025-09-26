import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import { FieldError } from 'react-hook-form';
import promisify from 'vest/promisify';
import type { Resolver, VestErrors } from './types';

const parseErrorSchema = (
  vestError: VestErrors,
  validateAllFieldCriteria: boolean,
) => {
  const errors: Record<string, FieldError> = {};
  for (const path in vestError) {
    if (!errors[path]) {
      errors[path] = { message: vestError[path][0], type: '' };
    }

    if (validateAllFieldCriteria) {
      errors[path].types = vestError[path].reduce<Record<number, string>>(
        (acc, message, index) => (acc[index] = message) && acc,
        {},
      );
    }
  }
  return errors;
};

export const vestResolver: Resolver =
  (schema, _, resolverOptions = {}) =>
  async (values, context, options) => {
    const result =
      resolverOptions.mode === 'sync'
        ? schema(values, options.names, context)
        : await promisify(schema)(values, options.names, context);

    if (result.hasErrors()) {
      return {
        values: {},
        errors: toNestErrors(
          parseErrorSchema(
            result.getErrors(),
            !options.shouldUseNativeValidation &&
              options.criteriaMode === 'all',
          ),
          options,
        ),
      };
    }

    options.shouldUseNativeValidation && validateFieldsNatively({}, options);

    return { values, errors: {} };
  };
