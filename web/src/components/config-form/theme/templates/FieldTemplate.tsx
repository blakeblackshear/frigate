// Field Template - wraps each form field with label and description
import { FieldTemplateProps, StrictRJSFSchema, UiSchema } from "@rjsf/utils";
import {
  getTemplate,
  getUiOptions,
  ADDITIONAL_PROPERTY_FLAG,
} from "@rjsf/utils";
import { ComponentType, ReactNode } from "react";
import { isValidElement } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { isNullableUnionSchema } from "../fields/nullableUtils";
import { getTranslatedLabel } from "@/utils/i18n";
import { ConfigFormContext } from "@/types/configForm";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { useDocDomain } from "@/hooks/use-doc-domain";

/**
 * Build the i18n translation key path for nested fields using the field path
 * provided by RJSF. This avoids ambiguity with underscores in field names and
 * skips dynamic filter labels for per-object filter fields.
 */
function buildTranslationPath(segments: string[], sectionI18nPrefix?: string) {
  // Example: filters.person.threshold -> filters.threshold or ov1.model -> model
  const filtersIndex = segments.indexOf("filters");
  if (filtersIndex !== -1 && segments.length > filtersIndex + 2) {
    const normalized = [
      ...segments.slice(0, filtersIndex + 1),
      ...segments.slice(filtersIndex + 2),
    ];
    return normalized.join(".");
  }

  // Example: detectors.ov1.type -> detectors.type
  const detectorsIndex = segments.indexOf("detectors");
  if (detectorsIndex !== -1 && segments.length > detectorsIndex + 2) {
    const normalized = [
      ...segments.slice(0, detectorsIndex + 1),
      ...segments.slice(detectorsIndex + 2),
    ];
    return normalized.join(".");
  }

  // If we are in the detectors section but 'detectors' is not in the path (specialized section)
  // then the first segment is the dynamic detector name.
  if (sectionI18nPrefix === "detectors" && segments.length > 1) {
    return segments.slice(1).join(".");
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

type FieldRenderSpec =
  | ReactNode
  | ComponentType<unknown>
  | {
      render: string;
      props?: Record<string, unknown>;
    };

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
  const sectionI18nPrefix = formContext?.sectionI18nPrefix as
    | string
    | undefined;
  const isCameraLevel = formContext?.level === "camera";
  const effectiveNamespace = isCameraLevel ? "config/cameras" : i18nNamespace;
  const { t, i18n } = useTranslation([
    effectiveNamespace || i18nNamespace || "common",
    i18nNamespace || "common",
    "views/settings",
  ]);
  const { getLocaleDocUrl } = useDocDomain();

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
  const translationPath = buildTranslationPath(pathSegments, sectionI18nPrefix);
  const filterObjectLabel = getFilterObjectLabel(pathSegments);
  const translatedFilterObjectLabel = filterObjectLabel
    ? getTranslatedLabel(filterObjectLabel, "object")
    : undefined;
  const fieldDocsKey = translationPath || pathSegments.join(".");
  const fieldDocsPath = fieldDocsKey
    ? formContext?.fieldDocs?.[fieldDocsKey]
    : undefined;
  const fieldDocsUrl = fieldDocsPath
    ? getLocaleDocUrl(fieldDocsPath)
    : undefined;

  // Use schema title/description as primary source (from JSON Schema)
  const schemaTitle = schema.title;
  const schemaDescription = schema.description;

  // Try to get translated label, falling back to schema title, then RJSF label
  let finalLabel = label;
  if (effectiveNamespace && translationPath) {
    // Prefer camera-scoped translations when a section prefix is provided
    const prefixedTranslationKey =
      sectionI18nPrefix && !translationPath.startsWith(`${sectionI18nPrefix}.`)
        ? `${sectionI18nPrefix}.${translationPath}.label`
        : undefined;
    const translationKey = `${translationPath}.label`;

    if (
      prefixedTranslationKey &&
      i18n.exists(prefixedTranslationKey, { ns: effectiveNamespace })
    ) {
      finalLabel = t(prefixedTranslationKey, { ns: effectiveNamespace });
    } else if (i18n.exists(translationKey, { ns: effectiveNamespace })) {
      finalLabel = t(translationKey, { ns: effectiveNamespace });
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
          const prefixedFieldTranslationKey =
            sectionI18nPrefix &&
            !fieldTranslationKey.startsWith(`${sectionI18nPrefix}.`)
              ? `${sectionI18nPrefix}.${fieldTranslationKey}`
              : undefined;

          if (
            prefixedFieldTranslationKey &&
            effectiveNamespace &&
            i18n.exists(prefixedFieldTranslationKey, { ns: effectiveNamespace })
          ) {
            fieldLabel = t(prefixedFieldTranslationKey, {
              ns: effectiveNamespace,
            });
          } else if (
            effectiveNamespace &&
            i18n.exists(fieldTranslationKey, { ns: effectiveNamespace })
          ) {
            fieldLabel = t(fieldTranslationKey, { ns: effectiveNamespace });
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
        const prefixedFieldTranslationKey =
          sectionI18nPrefix &&
          !fieldTranslationKey.startsWith(`${sectionI18nPrefix}.`)
            ? `${sectionI18nPrefix}.${fieldTranslationKey}`
            : undefined;

        if (
          prefixedFieldTranslationKey &&
          effectiveNamespace &&
          i18n.exists(prefixedFieldTranslationKey, { ns: effectiveNamespace })
        ) {
          fieldLabel = t(prefixedFieldTranslationKey, {
            ns: effectiveNamespace,
          });
        } else if (
          effectiveNamespace &&
          i18n.exists(fieldTranslationKey, { ns: effectiveNamespace })
        ) {
          fieldLabel = t(fieldTranslationKey, { ns: effectiveNamespace });
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
  if (effectiveNamespace && translationPath) {
    const prefixedDescriptionKey =
      sectionI18nPrefix && !translationPath.startsWith(`${sectionI18nPrefix}.`)
        ? `${sectionI18nPrefix}.${translationPath}.description`
        : undefined;
    const descriptionKey = `${translationPath}.description`;
    if (
      prefixedDescriptionKey &&
      i18n.exists(prefixedDescriptionKey, { ns: effectiveNamespace })
    ) {
      finalDescription = t(prefixedDescriptionKey, { ns: effectiveNamespace });
    } else if (i18n.exists(descriptionKey, { ns: effectiveNamespace })) {
      finalDescription = t(descriptionKey, { ns: effectiveNamespace });
    } else if (schemaDescription) {
      finalDescription = schemaDescription;
    }
  } else if (schemaDescription) {
    finalDescription = schemaDescription;
  }

  const uiOptions = getUiOptions(uiSchema);
  const beforeSpec = uiSchema?.["ui:before"] as FieldRenderSpec | undefined;
  const afterSpec = uiSchema?.["ui:after"] as FieldRenderSpec | undefined;

  const renderCustom = (spec: FieldRenderSpec | undefined) => {
    if (spec === undefined || spec === null) {
      return null;
    }

    if (isValidElement(spec) || typeof spec === "string") {
      return spec;
    }

    if (typeof spec === "number") {
      return <span>{spec}</span>;
    }

    if (typeof spec === "function") {
      const SpecComponent = spec as ComponentType<unknown>;
      return <SpecComponent />;
    }

    if (typeof spec === "object" && "render" in spec) {
      const renderKey = spec.render;
      const renderers = formContext?.renderers;
      const RenderComponent = renderers?.[renderKey];
      if (RenderComponent) {
        return <RenderComponent {...(spec.props ?? {})} />;
      }
    }

    return null;
  };

  const beforeContent = renderCustom(beforeSpec);
  const afterContent = renderCustom(afterSpec);
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
      <div className="flex flex-col space-y-6">
        {beforeContent}
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
                    {required && (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                  </Label>
                )}
                {finalDescription &&
                  !isMultiSchemaWrapper &&
                  !isAdditionalProperty && (
                    <p className="text-xs text-muted-foreground">
                      {finalDescription}
                    </p>
                  )}
                {fieldDocsUrl &&
                  !isMultiSchemaWrapper &&
                  !isObjectField &&
                  !isAdditionalProperty && (
                    <div className="flex items-center text-xs text-primary-variant">
                      <Link
                        to={fieldDocsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline"
                      >
                        {t("readTheDocumentation", { ns: "common" })}
                        <LuExternalLink className="ml-2 inline-flex size-3" />
                      </Link>
                    </div>
                  )}
              </div>
              <div className="flex items-center gap-2">{children}</div>
            </div>
          ) : (
            <>
              {children}

              {finalDescription &&
                !isMultiSchemaWrapper &&
                !isObjectField &&
                !isAdditionalProperty && (
                  <p className="text-xs text-muted-foreground">
                    {finalDescription}
                  </p>
                )}
              {fieldDocsUrl &&
                !isMultiSchemaWrapper &&
                !isObjectField &&
                !isAdditionalProperty && (
                  <div className="flex items-center text-xs text-primary-variant">
                    <Link
                      to={fieldDocsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      {t("readTheDocumentation", { ns: "common" })}
                      <LuExternalLink className="ml-2 inline-flex size-3" />
                    </Link>
                  </div>
                )}
            </>
          )}

          {errors}
          {help}
        </div>
        {afterContent}
      </div>
    </WrapIfAdditionalTemplate>
  );
}
