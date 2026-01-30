// Field Template - wraps each form field with label and description
import { FieldTemplateProps, StrictRJSFSchema, UiSchema } from "@rjsf/utils";
import {
  getTemplate,
  getUiOptions,
  ADDITIONAL_PROPERTY_FLAG,
} from "@rjsf/utils";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { isNullableUnionSchema } from "../fields/nullableUtils";
import { getTranslatedLabel } from "@/utils/i18n";
import { ConfigFormContext } from "@/types/configForm";

/**
 * Build the i18n translation key path for nested fields using the field path
 * provided by RJSF. This avoids ambiguity with underscores in field names and
 * skips dynamic filter labels for per-object filter fields.
 */
function buildTranslationPath(path: Array<string | number>): string {
  const segments = path.filter(
    (segment): segment is string => typeof segment === "string",
  );

  const filtersIndex = segments.indexOf("filters");
  if (filtersIndex !== -1 && segments.length > filtersIndex + 2) {
    const normalized = [
      ...segments.slice(0, filtersIndex + 1),
      ...segments.slice(filtersIndex + 2),
    ];
    return normalized.join(".");
  }

  return segments.join(".");
}

function getFilterObjectLabel(pathSegments: string[]): string | undefined {
  const filtersIndex = pathSegments.indexOf("filters");
  if (filtersIndex === -1 || pathSegments.length <= filtersIndex + 1) {
    return undefined;
  }
  const objectLabel = pathSegments[filtersIndex + 1];
  return typeof objectLabel === "string" && objectLabel.length > 0
    ? objectLabel
    : undefined;
}

function humanizeKey(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function FieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    label,
    children,
    classNames,
    style,
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
    onKeyRename,
    onKeyRenameBlur,
    onRemoveProperty,
    rawDescription,
    rawErrors,
    disabled,
    readonly,
  } = props;

  // Get i18n namespace from form context (passed through registry)
  const formContext = registry?.formContext as ConfigFormContext | undefined;
  const i18nNamespace = formContext?.i18nNamespace as string | undefined;
  const { t, i18n } = useTranslation([
    i18nNamespace || "common",
    "views/settings",
  ]);

  if (hidden) {
    return <div className="hidden">{children}</div>;
  }

  // Get UI options
  const uiOptionsFromSchema = uiSchema?.["ui:options"] || {};

  // Determine field characteristics
  const isAdvanced = uiOptionsFromSchema.advanced === true;
  const isBoolean =
    schema.type === "boolean" ||
    (Array.isArray(schema.type) && schema.type.includes("boolean"));
  const isObjectField = schema.type === "object";
  const isNullableUnion = isNullableUnionSchema(schema as StrictRJSFSchema);
  const isAdditionalProperty = ADDITIONAL_PROPERTY_FLAG in schema;
  const suppressMultiSchema =
    (uiSchema?.["ui:options"] as UiSchema["ui:options"] | undefined)
      ?.suppressMultiSchema === true;

  // Only suppress labels/descriptions if this is a multi-schema field (anyOf/oneOf) with suppressMultiSchema flag
  // This prevents duplicate labels while still showing the inner field's label
  const isMultiSchemaWrapper =
    (schema.anyOf || schema.oneOf) && (suppressMultiSchema || isNullableUnion);

  // Get translation path for this field
  const pathSegments = fieldPathId.path.filter(
    (segment): segment is string => typeof segment === "string",
  );
  const translationPath = buildTranslationPath(pathSegments);
  const filterObjectLabel = getFilterObjectLabel(pathSegments);
  const translatedFilterObjectLabel = filterObjectLabel
    ? getTranslatedLabel(filterObjectLabel, "object")
    : undefined;

  // Use schema title/description as primary source (from JSON Schema)
  const schemaTitle = schema.title;
  const schemaDescription = schema.description;

  // Try to get translated label, falling back to schema title, then RJSF label
  let finalLabel = label;
  if (i18nNamespace && translationPath) {
    const translationKey = `${translationPath}.label`;
    if (i18n.exists(translationKey, { ns: i18nNamespace })) {
      finalLabel = t(translationKey, { ns: i18nNamespace });
    } else if (schemaTitle) {
      finalLabel = schemaTitle;
    } else if (translatedFilterObjectLabel) {
      const filtersIndex = pathSegments.indexOf("filters");
      const isFilterObjectField =
        filtersIndex > -1 && pathSegments.length === filtersIndex + 2;

      if (isFilterObjectField) {
        finalLabel = translatedFilterObjectLabel;
      } else {
        // Try to get translated field label, fall back to humanized
        const fieldName = pathSegments[pathSegments.length - 1] || "";
        let fieldLabel = schemaTitle;
        if (!fieldLabel) {
          const fieldTranslationKey = `${fieldName}.label`;
          if (
            i18nNamespace &&
            i18n.exists(fieldTranslationKey, { ns: i18nNamespace })
          ) {
            fieldLabel = t(fieldTranslationKey, { ns: i18nNamespace });
          } else {
            fieldLabel = humanizeKey(fieldName);
          }
        }
        if (fieldLabel) {
          finalLabel = t("configForm.filters.objectFieldLabel", {
            ns: "views/settings",
            field: fieldLabel,
            label: translatedFilterObjectLabel,
          });
        }
      }
    }
  } else if (schemaTitle) {
    finalLabel = schemaTitle;
  } else if (translatedFilterObjectLabel) {
    const filtersIndex = pathSegments.indexOf("filters");
    const isFilterObjectField =
      filtersIndex > -1 && pathSegments.length === filtersIndex + 2;
    if (isFilterObjectField) {
      finalLabel = translatedFilterObjectLabel;
    } else {
      // Try to get translated field label, fall back to humanized
      const fieldName = pathSegments[pathSegments.length - 1] || "";
      let fieldLabel = schemaTitle;
      if (!fieldLabel) {
        const fieldTranslationKey = `${fieldName}.label`;
        if (
          i18nNamespace &&
          i18n.exists(fieldTranslationKey, { ns: i18nNamespace })
        ) {
          fieldLabel = t(fieldTranslationKey, { ns: i18nNamespace });
        } else {
          fieldLabel = humanizeKey(fieldName);
        }
      }
      if (fieldLabel) {
        finalLabel = t("configForm.filters.objectFieldLabel", {
          ns: "views/settings",
          field: fieldLabel,
          label: translatedFilterObjectLabel,
        });
      }
    }
  }

  // Try to get translated description, falling back to schema description
  let finalDescription = description || "";
  if (i18nNamespace && translationPath) {
    const descriptionKey = `${translationPath}.description`;
    if (i18n.exists(descriptionKey, { ns: i18nNamespace })) {
      finalDescription = t(descriptionKey, { ns: i18nNamespace });
    } else if (schemaDescription) {
      finalDescription = schemaDescription;
    }
  } else if (schemaDescription) {
    finalDescription = schemaDescription;
  }

  const uiOptions = getUiOptions(uiSchema);
  const WrapIfAdditionalTemplate = getTemplate(
    "WrapIfAdditionalTemplate",
    registry,
    uiOptions,
  );

  return (
    <WrapIfAdditionalTemplate
      classNames={classNames}
      style={style}
      disabled={disabled}
      id={id}
      label={label}
      displayLabel={displayLabel}
      onKeyRename={onKeyRename}
      onKeyRenameBlur={onKeyRenameBlur}
      onRemoveProperty={onRemoveProperty}
      rawDescription={rawDescription}
      readonly={readonly}
      required={required}
      schema={schema}
      uiSchema={uiSchema}
      registry={registry}
      rawErrors={rawErrors}
      hideError={false}
    >
      <div
        className={cn(
          "space-y-1",
          isAdvanced && "border-l-2 border-muted pl-4",
          isBoolean && "flex items-center justify-between gap-4",
        )}
        data-field-id={translationPath}
      >
        {displayLabel &&
          finalLabel &&
          !isBoolean &&
          !isMultiSchemaWrapper &&
          !isObjectField &&
          !isAdditionalProperty && (
            <Label
              htmlFor={id}
              className={cn(
                "text-sm font-medium",
                errors &&
                  errors.props?.errors?.length > 0 &&
                  "text-destructive",
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
                <p className="text-xs text-muted-foreground">
                  {finalDescription}
                </p>
              )}
            </div>
            {children}
          </div>
        ) : (
          <>
            {children}
            {finalDescription && !isMultiSchemaWrapper && !isObjectField && (
              <p className="text-xs text-muted-foreground">
                {finalDescription}
              </p>
            )}
          </>
        )}

        {errors}
        {help}
      </div>
    </WrapIfAdditionalTemplate>
  );
}
