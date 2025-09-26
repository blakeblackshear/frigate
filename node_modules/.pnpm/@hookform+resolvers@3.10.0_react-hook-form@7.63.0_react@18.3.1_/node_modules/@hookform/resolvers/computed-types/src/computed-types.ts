import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import type { ValidationError } from 'computed-types';
import type { FieldErrors } from 'react-hook-form';
import type { Resolver } from './types';

const isValidationError = (error: any): error is ValidationError =>
  error.errors != null;

const parseErrorSchema = (computedTypesError: ValidationError) => {
  const parsedErrors: FieldErrors = {};
  return (computedTypesError.errors || []).reduce((acc, error) => {
    acc[error.path.join('.')] = {
      type: error.error.name,
      message: error.error.message,
    };

    return acc;
  }, parsedErrors);
};

export const computedTypesResolver: Resolver =
  (schema) => async (values, _, options) => {
    try {
      const data = await schema(values);

      options.shouldUseNativeValidation && validateFieldsNatively({}, options);

      return {
        errors: {},
        values: data,
      };
    } catch (error: any) {
      if (isValidationError(error)) {
        return {
          values: {},
          errors: toNestErrors(parseErrorSchema(error), options),
        };
      }

      throw error;
    }
  };
