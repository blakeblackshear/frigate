import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import type { ValidationError } from 'joi';
import { FieldError, appendErrors } from 'react-hook-form';
import { Resolver } from './types';

const parseErrorSchema = (
  error: ValidationError,
  validateAllFieldCriteria: boolean,
) =>
  error.details.length
    ? error.details.reduce<Record<string, FieldError>>((previous, error) => {
        const _path = error.path.join('.');

        if (!previous[_path]) {
          previous[_path] = { message: error.message, type: error.type };
        }

        if (validateAllFieldCriteria) {
          const types = previous[_path].types;
          const messages = types && types[error.type!];

          previous[_path] = appendErrors(
            _path,
            validateAllFieldCriteria,
            previous,
            error.type,
            messages
              ? ([] as string[]).concat(messages as string[], error.message)
              : error.message,
          ) as FieldError;
        }

        return previous;
      }, {})
    : {};

export const joiResolver: Resolver =
  (
    schema,
    schemaOptions = {
      abortEarly: false,
    },
    resolverOptions = {},
  ) =>
  async (values, context, options) => {
    const _schemaOptions = Object.assign({}, schemaOptions, {
      context,
    });

    let result: Record<string, any> = {};
    if (resolverOptions.mode === 'sync') {
      result = schema.validate(values, _schemaOptions);
    } else {
      try {
        result.value = await schema.validateAsync(values, _schemaOptions);
      } catch (e) {
        result.error = e;
      }
    }

    if (result.error) {
      return {
        values: {},
        errors: toNestErrors(
          parseErrorSchema(
            result.error,
            !options.shouldUseNativeValidation &&
              options.criteriaMode === 'all',
          ),
          options,
        ),
      };
    }

    options.shouldUseNativeValidation && validateFieldsNatively({}, options);

    return {
      errors: {},
      values: result.value,
    };
  };
