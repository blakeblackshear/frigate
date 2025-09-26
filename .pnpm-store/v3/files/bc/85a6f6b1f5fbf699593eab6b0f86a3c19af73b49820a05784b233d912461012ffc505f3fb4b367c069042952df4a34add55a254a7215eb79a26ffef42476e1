import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import { SimpleErrorReporter, errors } from '@vinejs/vine';
import { FieldError, FieldErrors, appendErrors } from 'react-hook-form';
import type { Resolver } from './types';

const parseErrorSchema = (
  vineErrors: SimpleErrorReporter['errors'],
  validateAllFieldCriteria: boolean,
) => {
  const schemaErrors: Record<string, FieldError> = {};

  for (; vineErrors.length; ) {
    const error = vineErrors[0];
    const path = error.field;

    if (!(path in schemaErrors)) {
      schemaErrors[path] = { message: error.message, type: error.rule };
    }

    if (validateAllFieldCriteria) {
      const { types } = schemaErrors[path];
      const messages = types && types[error.rule];

      schemaErrors[path] = appendErrors(
        path,
        validateAllFieldCriteria,
        schemaErrors,
        error.rule,
        messages ? [...(messages as string[]), error.message] : error.message,
      ) as FieldError;
    }

    vineErrors.shift();
  }

  return schemaErrors;
};

export const vineResolver: Resolver =
  (schema, schemaOptions, resolverOptions = {}) =>
  async (values, _, options) => {
    try {
      const data = await schema.validate(values, schemaOptions);

      options.shouldUseNativeValidation && validateFieldsNatively({}, options);

      return {
        errors: {} as FieldErrors,
        values: resolverOptions.raw ? values : data,
      };
    } catch (error: any) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return {
          values: {},
          errors: toNestErrors(
            parseErrorSchema(
              error.messages,
              !options.shouldUseNativeValidation &&
                options.criteriaMode === 'all',
            ),
            options,
          ),
        };
      }

      throw error;
    }
  };
