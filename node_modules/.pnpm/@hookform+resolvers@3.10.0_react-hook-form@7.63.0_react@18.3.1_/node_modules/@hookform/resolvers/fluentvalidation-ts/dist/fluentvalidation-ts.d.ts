import { AsyncValidator, Validator } from 'fluentvalidation-ts';
import { FieldValues, Resolver } from 'react-hook-form';
export declare function fluentValidationResolver<TFieldValues extends FieldValues>(validator: Validator<TFieldValues>): Resolver<TFieldValues>;
export declare function fluentAsyncValidationResolver<TFieldValues extends FieldValues, TValidator extends AsyncValidator<TFieldValues>>(validator: TValidator): Resolver<TFieldValues>;
