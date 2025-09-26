import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import {
  AsyncValidator,
  ValidationErrors,
  Validator,
} from 'fluentvalidation-ts';
import { FieldError, FieldValues, Resolver } from 'react-hook-form';

function traverseObject<T>(
  object: ValidationErrors<T>,
  errors: Record<string, FieldError>,
  parentIndices: (string | number)[] = [],
) {
  for (const key in object) {
    const currentIndex = [...parentIndices, key];
    const currentValue = object[key];

    if (Array.isArray(currentValue)) {
      currentValue.forEach((item: any, index: number) => {
        traverseObject(item, errors, [...currentIndex, index]);
      });
    } else if (typeof currentValue === 'object' && currentValue !== null) {
      traverseObject(currentValue, errors, currentIndex);
    } else if (typeof currentValue === 'string') {
      errors[currentIndex.join('.')] = {
        type: 'validation',
        message: currentValue,
      };
    }
  }
}

const parseErrorSchema = <T>(
  validationErrors: ValidationErrors<T>,
  validateAllFieldCriteria: boolean,
) => {
  if (validateAllFieldCriteria) {
    // TODO: check this but i think its always one validation error
  }

  const errors: Record<string, FieldError> = {};
  traverseObject(validationErrors, errors);

  return errors;
};

export function fluentValidationResolver<TFieldValues extends FieldValues>(
  validator: Validator<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values, _context, options) => {
    const validationResult = validator.validate(values);
    const isValid = Object.keys(validationResult).length === 0;

    options.shouldUseNativeValidation && validateFieldsNatively({}, options);

    return isValid
      ? {
          values: values,
          errors: {},
        }
      : {
          values: {},
          errors: toNestErrors(
            parseErrorSchema(
              validationResult,
              !options.shouldUseNativeValidation &&
                options.criteriaMode === 'all',
            ),
            options,
          ),
        };
  };
}

export function fluentAsyncValidationResolver<
  TFieldValues extends FieldValues,
  TValidator extends AsyncValidator<TFieldValues>,
>(validator: TValidator): Resolver<TFieldValues> {
  return async (values, _context, options) => {
    const validationResult = await validator.validateAsync(values);
    const isValid = Object.keys(validationResult).length === 0;

    options.shouldUseNativeValidation && validateFieldsNatively({}, options);

    return isValid
      ? {
          values: values,
          errors: {},
        }
      : {
          values: {},
          errors: toNestErrors(
            parseErrorSchema(
              validationResult,
              !options.shouldUseNativeValidation &&
                options.criteriaMode === 'all',
            ),
            options,
          ),
        };
  };
}
