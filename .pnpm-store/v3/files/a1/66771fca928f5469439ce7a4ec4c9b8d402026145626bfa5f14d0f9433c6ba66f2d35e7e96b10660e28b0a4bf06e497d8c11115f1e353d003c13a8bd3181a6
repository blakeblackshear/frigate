import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import { plainToClass } from 'class-transformer';
import { ValidationError, validate, validateSync } from 'class-validator';
import { FieldErrors } from 'react-hook-form';
import type { Resolver } from './types';

const parseErrors = (
  errors: ValidationError[],
  validateAllFieldCriteria: boolean,
  parsedErrors: FieldErrors = {},
  path = '',
) => {
  return errors.reduce((acc, error) => {
    const _path = path ? `${path}.${error.property}` : error.property;

    if (error.constraints) {
      const key = Object.keys(error.constraints)[0];
      acc[_path] = {
        type: key,
        message: error.constraints[key],
      };

      const _e = acc[_path];
      if (validateAllFieldCriteria && _e) {
        Object.assign(_e, { types: error.constraints });
      }
    }

    if (error.children && error.children.length) {
      parseErrors(error.children, validateAllFieldCriteria, acc, _path);
    }

    return acc;
  }, parsedErrors);
};

export const classValidatorResolver: Resolver =
  (schema, schemaOptions = {}, resolverOptions = {}) =>
  async (values, _, options) => {
    const { transformer, validator } = schemaOptions;
    const data = plainToClass(schema, values, transformer);

    const rawErrors = await (resolverOptions.mode === 'sync'
      ? validateSync
      : validate)(data, validator);

    if (rawErrors.length) {
      return {
        values: {},
        errors: toNestErrors(
          parseErrors(
            rawErrors,
            !options.shouldUseNativeValidation &&
              options.criteriaMode === 'all',
          ),
          options,
        ),
      };
    }

    options.shouldUseNativeValidation && validateFieldsNatively({}, options);

    return {
      values: resolverOptions.rawValues ? values : data,
      errors: {},
    };
  };
