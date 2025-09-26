import { toNestErrors } from '@hookform/resolvers';
import { FieldError, FieldValues, appendErrors } from 'react-hook-form';
import { getDotPath, safeParseAsync } from 'valibot';
import type { Resolver } from './types';

export const valibotResolver: Resolver =
  (schema, schemaOptions, resolverOptions = {}) =>
  async (values, _, options) => {
    // Check if we should validate all field criteria
    const validateAllFieldCriteria =
      !options.shouldUseNativeValidation && options.criteriaMode === 'all';

    // Parse values with Valibot schema
    const result = await safeParseAsync(
      schema,
      values,
      Object.assign({}, schemaOptions, {
        abortPipeEarly: !validateAllFieldCriteria,
      }),
    );

    // If there are issues, return them as errors
    if (result.issues) {
      // Create errors object
      const errors: Record<string, FieldError> = {};

      // Iterate over issues to add them to errors object
      for (; result.issues.length; ) {
        const issue = result.issues[0];
        // Create dot path from issue
        const path = getDotPath(issue);

        if (path) {
          // Add first error of path to errors object
          if (!errors[path]) {
            errors[path] = { message: issue.message, type: issue.type };
          }

          // If configured, add all errors of path to errors object
          if (validateAllFieldCriteria) {
            const types = errors[path].types;
            const messages = types && types[issue.type];
            errors[path] = appendErrors(
              path,
              validateAllFieldCriteria,
              errors,
              issue.type,
              messages
                ? ([] as string[]).concat(
                    messages as string | string[],
                    issue.message,
                  )
                : issue.message,
            ) as FieldError;
          }
        }

        result.issues.shift();
      }

      // Return resolver result with errors
      return {
        values: {},
        errors: toNestErrors(errors, options),
      } as const;
    }

    // Otherwise, return resolver result with values
    return {
      values: resolverOptions.raw ? values : (result.output as FieldValues),
      errors: {},
    };
  };
