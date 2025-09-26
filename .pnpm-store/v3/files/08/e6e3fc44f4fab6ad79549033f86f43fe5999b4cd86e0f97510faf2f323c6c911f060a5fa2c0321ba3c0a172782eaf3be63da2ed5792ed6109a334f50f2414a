import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import {
  FieldError,
  FieldValues,
  Resolver,
  appendErrors,
} from 'react-hook-form';
import * as Yup from 'yup';

/**
 * Why `path!` ? because it could be `undefined` in some case
 * https://github.com/jquense/yup#validationerrorerrors-string--arraystring-value-any-path-string
 */
const parseErrorSchema = (
  error: Yup.ValidationError,
  validateAllFieldCriteria: boolean,
) => {
  return (error.inner || []).reduce<Record<string, FieldError>>(
    (previous, error) => {
      if (!previous[error.path!]) {
        previous[error.path!] = { message: error.message, type: error.type! };
      }

      if (validateAllFieldCriteria) {
        const types = previous[error.path!].types;
        const messages = types && types[error.type!];

        previous[error.path!] = appendErrors(
          error.path!,
          validateAllFieldCriteria,
          previous,
          error.type!,
          messages
            ? ([] as string[]).concat(messages as string[], error.message)
            : error.message,
        ) as FieldError;
      }

      return previous;
    },
    {},
  );
};

export function yupResolver<TFieldValues extends FieldValues>(
  schema:
    | Yup.ObjectSchema<TFieldValues>
    | ReturnType<typeof Yup.lazy<Yup.ObjectSchema<TFieldValues>>>,
  schemaOptions: Parameters<(typeof schema)['validate']>[1] = {},
  resolverOptions: {
    /**
     * @default async
     */
    mode?: 'async' | 'sync';
    /**
     * Return the raw input values rather than the parsed values.
     * @default false
     */
    raw?: boolean;
  } = {},
): Resolver<Yup.InferType<typeof schema>> {
  return async (values, context, options) => {
    try {
      if (schemaOptions.context && process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn(
          "You should not used the yup options context. Please, use the 'useForm' context object instead",
        );
      }

      const result = await schema[
        resolverOptions.mode === 'sync' ? 'validateSync' : 'validate'
      ](
        values,
        Object.assign({ abortEarly: false }, schemaOptions, { context }),
      );

      options.shouldUseNativeValidation && validateFieldsNatively({}, options);

      return {
        values: resolverOptions.raw ? values : result,
        errors: {},
      };
    } catch (e: any) {
      if (!e.inner) {
        throw e;
      }

      return {
        values: {},
        errors: toNestErrors(
          parseErrorSchema(
            e,
            !options.shouldUseNativeValidation &&
              options.criteriaMode === 'all',
          ),
          options,
        ),
      };
    }
  };
}
