import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import { ArkErrors } from 'arktype';
import { FieldError, FieldErrors } from 'react-hook-form';
import type { Resolver } from './types';

const parseErrorSchema = (e: ArkErrors): Record<string, FieldError> => {
  // copy code to type to match FieldError shape
  e.forEach((e) => Object.assign(e, { type: e.code }));
  // need to cast here because TS doesn't understand we added the type field
  return e.byPath as never;
};

export const arktypeResolver: Resolver =
  (schema, _schemaOptions, resolverOptions = {}) =>
  (values, _, options) => {
    const out = schema(values);

    if (out instanceof ArkErrors) {
      return {
        values: {},
        errors: toNestErrors(parseErrorSchema(out), options),
      };
    }

    options.shouldUseNativeValidation && validateFieldsNatively({}, options);

    return {
      errors: {} as FieldErrors,
      values: resolverOptions.raw ? values : out,
    };
  };
