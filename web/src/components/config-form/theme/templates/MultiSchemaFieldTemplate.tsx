// Custom MultiSchemaFieldTemplate to handle anyOf [Type, null] fields
// Renders simple nullable types as single inputs instead of dropdowns

import {
  MultiSchemaFieldTemplateProps,
  StrictRJSFSchema,
  FormContextType,
  UiSchema,
} from "@rjsf/utils";
import { isNullableUnionSchema } from "../fields/nullableUtils";

/**
 * Custom MultiSchemaFieldTemplate that:
 * 1. Renders simple anyOf [Type, null] fields as single inputs
 * 2. Falls back to default behavior for complex types
 */
export function MultiSchemaFieldTemplate<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T = any,
  S extends StrictRJSFSchema = StrictRJSFSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends FormContextType = any,
>(props: MultiSchemaFieldTemplateProps<T, S, F>): JSX.Element {
  const { schema, selector, optionSchemaField, uiSchema } = props;

  const uiOptions = uiSchema?.["ui:options"] as
    | UiSchema["ui:options"]
    | undefined;
  const suppressMultiSchema = uiOptions?.suppressMultiSchema === true;

  // Check if this is a simple nullable field that should be handled specially
  if (isNullableUnionSchema(schema) || suppressMultiSchema) {
    // For simple nullable fields, just render the field directly without the dropdown selector
    // This handles the case where empty input = null
    return <>{optionSchemaField}</>;
  }

  // For all other cases, render with both selector and field (default MultiSchemaField behavior)
  return (
    <>
      {selector}
      {optionSchemaField}
    </>
  );
}
