import type { RJSFSchema } from "@rjsf/utils";

type NumericInputOptions = {
  signed?: boolean;
};

/**
 * Derive the on-screen keyboard hint for a schema field.
 *
 * Numeric config fields render as text inputs because RJSF's NumberField
 * relies on the widget echoing raw strings back, so that trailing "." and "0"
 * characters survive while a value is being typed. That means the numeric
 * keypad has to be requested explicitly. Desktop browsers ignore inputMode, so
 * this only affects virtual keyboards.
 *
 * Fields accepting negative values opt out, since the iOS numeric and decimal
 * keypads have no minus key. Most numeric fields declare no minimum even
 * though they are non-negative, so signed fields are marked explicitly with
 * ui:options.signed.
 *
 * Args:
 *     schema: The JSON schema for the field being rendered
 *     options: The resolved ui:options for the field
 *
 * Returns:
 *     The inputMode to apply, or undefined to leave the keyboard alone
 */
export function getNumericInputMode(
  schema: RJSFSchema,
  options: unknown,
): "numeric" | "decimal" | undefined {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const isInteger = types.includes("integer");

  if (!isInteger && !types.includes("number")) {
    return undefined;
  }

  const numericOptions =
    typeof options === "object" && options !== null
      ? (options as NumericInputOptions)
      : undefined;

  const minimum = schema.minimum ?? schema.exclusiveMinimum;

  if (numericOptions?.signed || (minimum ?? 0) < 0) {
    return undefined;
  }

  return isInteger ? "numeric" : "decimal";
}
