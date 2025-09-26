export type JSONSchema4 = import("json-schema").JSONSchema4;
export type JSONSchema6 = import("json-schema").JSONSchema6;
export type JSONSchema7 = import("json-schema").JSONSchema7;
export type ErrorObject = import("ajv").ErrorObject;
export type ExtendedSchema = {
  formatMinimum?: (string | number) | undefined;
  formatMaximum?: (string | number) | undefined;
  formatExclusiveMinimum?: (string | boolean) | undefined;
  formatExclusiveMaximum?: (string | boolean) | undefined;
  link?: string | undefined;
  undefinedAsNull?: boolean | undefined;
};
export type Extend = ExtendedSchema;
export type Schema = (JSONSchema4 | JSONSchema6 | JSONSchema7) & ExtendedSchema;
export type SchemaUtilErrorObject = ErrorObject & {
  children?: Array<ErrorObject>;
};
export type PostFormatter = (
  formattedError: string,
  error: SchemaUtilErrorObject
) => string;
export type ValidationErrorConfiguration = {
  name?: string | undefined;
  baseDataPath?: string | undefined;
  postFormatter?: PostFormatter | undefined;
};
/**
 * @param {Schema} schema
 * @param {Array<object> | object} options
 * @param {ValidationErrorConfiguration=} configuration
 * @returns {void}
 */
export function validate(
  schema: Schema,
  options: Array<object> | object,
  configuration?: ValidationErrorConfiguration | undefined
): void;
export function enableValidation(): void;
export function disableValidation(): void;
export function needValidate(): boolean;
import ValidationError from "./ValidationError";
export { ValidationError };
