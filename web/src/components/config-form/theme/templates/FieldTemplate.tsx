// Field Template - wraps each form field with label and description
import type { FieldTemplateProps, StrictRJSFSchema } from "@rjsf/utils";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { isNullableUnionSchema } from "../fields/nullableUtils";

/**
 * Build the i18n translation key path for nested fields using the field path
 * provided by RJSF. This avoids ambiguity with underscores in field names.
 */
function buildTranslationPath(path: Array<string | number>): string {
  return path.filter((segment) => typeof segment === "string").join(".");
}

export function FieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    label,
    children,
    errors,
    help,
    description,
    hidden,
    required,
    displayLabel,
    schema,
    uiSchema,
    registry,
    fieldPathId,
  } = props;

  // Get i18n namespace from form context (passed through registry)
  const formContext = registry?.formContext as
    | Record<string, unknown>
    | undefined;
  const i18nNamespace = formContext?.i18nNamespace as string | undefined;
  const { t } = useTranslation([i18nNamespace || "common"]);

  if (hidden) {
    return <div className="hidden">{children}</div>;
  }

  // Get UI options
  const uiOptions = uiSchema?.["ui:options"] || {};

  // Determine field characteristics
  const isAdvanced = uiOptions.advanced === true;
  const isBoolean = schema.type === "boolean";
  const isObjectField = schema.type === "object";
  const isNullableUnion = isNullableUnionSchema(schema as StrictRJSFSchema);
  const suppressMultiSchema =
    (uiSchema?.["ui:options"] as Record<string, unknown> | undefined)
      ?.suppressMultiSchema === true;

  // Only suppress labels/descriptions if this is a multi-schema field (anyOf/oneOf) with suppressMultiSchema flag
  // This prevents duplicate labels while still showing the inner field's label
  const isMultiSchemaWrapper =
    (schema.anyOf || schema.oneOf) && (suppressMultiSchema || isNullableUnion);

  // Get translation path for this field
  const translationPath = buildTranslationPath(fieldPathId.path);

  // Use schema title/description as primary source (from JSON Schema)
  const schemaTitle = (schema as Record<string, unknown>).title as
    | string
    | undefined;
  const schemaDescription = (schema as Record<string, unknown>).description as
    | string
    | undefined;

  // Try to get translated label, falling back to schema title, then RJSF label
  let finalLabel = label;
  if (i18nNamespace && translationPath) {
    const translationKey = `${translationPath}.label`;
    const translatedLabel = t(translationKey, {
      ns: i18nNamespace,
      defaultValue: "",
    });
    // Only use translation if it's not the key itself (which means translation exists)
    if (translatedLabel && translatedLabel !== translationKey) {
      finalLabel = translatedLabel;
    } else if (schemaTitle) {
      finalLabel = schemaTitle;
    }
  } else if (schemaTitle) {
    finalLabel = schemaTitle;
  }

  // Try to get translated description, falling back to schema description
  let finalDescription = description || "";
  if (i18nNamespace && translationPath) {
    const translatedDesc = t(`${translationPath}.description`, {
      ns: i18nNamespace,
      defaultValue: "",
    });
    if (translatedDesc && translatedDesc !== `${translationPath}.description`) {
      finalDescription = translatedDesc;
    } else if (schemaDescription) {
      finalDescription = schemaDescription;
    }
  } else if (schemaDescription) {
    finalDescription = schemaDescription;
  }

  return (
    <div
      className={cn(
        "space-y-2",
        isAdvanced && "border-l-2 border-muted pl-4",
        isBoolean && "flex items-center justify-between gap-4",
      )}
      data-field-id={translationPath}
    >
      {displayLabel && finalLabel && !isBoolean && !isMultiSchemaWrapper && (
        <Label
          htmlFor={id}
          className={cn(
            "text-sm font-medium",
            errors && errors.props?.errors?.length > 0 && "text-destructive",
          )}
        >
          {finalLabel}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}

      {isBoolean ? (
        <div className="flex w-full items-center justify-between gap-4">
          <div className="space-y-0.5">
            {displayLabel && finalLabel && (
              <Label htmlFor={id} className="text-sm font-medium">
                {finalLabel}
                {required && <span className="ml-1 text-destructive">*</span>}
              </Label>
            )}
            {finalDescription && !isMultiSchemaWrapper && (
              <p className="max-w-md text-xs text-muted-foreground">
                {finalDescription}
              </p>
            )}
          </div>
          {children}
        </div>
      ) : (
        <>
          {finalDescription && !isMultiSchemaWrapper && !isObjectField && (
            <p className="text-xs text-muted-foreground">{finalDescription}</p>
          )}
          {children}
        </>
      )}

      {errors}
      {help}
    </div>
  );
}
