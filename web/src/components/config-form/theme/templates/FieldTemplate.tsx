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
import { requiresRestartForFieldPath } from "@/utils/configUtil";
import RestartRequiredIndicator from "@/components/indicators/RestartRequiredIndicator";
import {
  buildTranslationPath,
  getFilterObjectLabel,
  hasOverrideAtPath,
  humanizeKey,
  normalizeFieldValue,
} from "../utils";
import { normalizeOverridePath } from "../utils/overrides";
import get from "lodash/get";
import isEqual from "lodash/isEqual";
import { SPLIT_ROW_CLASS_NAME } from "@/components/card/SettingsGroupCard";

function _isArrayItemInAdditionalProperty(
  pathSegments: Array<string | number>,
): boolean {
  // // If we find a numeric index, this is an array item
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    if (typeof segment === "number") {
      // Consider any array item as being inside additional properties if it's not at the root level
      return i > 0;
    }
  }
  return false;
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
    formData: fieldFormData,
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

  const suppressDescription = uiOptionsFromSchema.suppressDescription === true;
  const showArrayItemDescription =
    uiOptionsFromSchema.showArrayItemDescription === true;

  // Determine field characteristics
  const isBoolean =
    schema.type === "boolean" ||
    (Array.isArray(schema.type) && schema.type.includes("boolean"));
  const isObjectField =
    schema.type === "object" ||
    (Array.isArray(schema.type) && schema.type.includes("object"));
  const isNullableUnion = isNullableUnionSchema(schema as StrictRJSFSchema);
  const isAdditionalProperty = ADDITIONAL_PROPERTY_FLAG in schema;
  const suppressMultiSchema =
    (uiSchema?.["ui:options"] as UiSchema["ui:options"] | undefined)
      ?.suppressMultiSchema === true;
  const schemaTypes = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : [];
  const nonNullSchemaTypes = schemaTypes.filter((type) => type !== "null");
  const isScalarValueField =
    nonNullSchemaTypes.length === 1 &&
    ["string", "number", "integer"].includes(nonNullSchemaTypes[0]);

  // Only suppress labels/descriptions if this is a multi-schema field (anyOf/oneOf) with suppressMultiSchema flag
  // This prevents duplicate labels while still showing the inner field's label
  const isMultiSchemaWrapper =
    (schema.anyOf || schema.oneOf) && (suppressMultiSchema || isNullableUnion);
  const useSplitBooleanLayout =
    uiOptionsFromSchema.splitLayout !== false &&
    isBoolean &&
    !isMultiSchemaWrapper &&
    !isObjectField &&
    !isAdditionalProperty;
  const forceSplitLayout = uiOptionsFromSchema.forceSplitLayout === true;
  const useSplitLayout =
    uiOptionsFromSchema.splitLayout !== false &&
    (isScalarValueField || forceSplitLayout) &&
    !isBoolean &&
    !isMultiSchemaWrapper &&
    !isObjectField &&
    !isAdditionalProperty;

  // Get translation path for this field
  const pathSegments = fieldPathId.path.filter(
    (segment): segment is string => typeof segment === "string",
  );

  // Check if this is an array item inside an object with additionalProperties
  const isArrayItemInAdditionalProp = _isArrayItemInAdditionalProperty(
    fieldPathId.path,
  );

  // Conditions for showing descriptions/docs links
  const shouldShowDescription =
    !isMultiSchemaWrapper &&
    !isObjectField &&
    !isAdditionalProperty &&
    (!isArrayItemInAdditionalProp || showArrayItemDescription) &&
    !suppressDescription;

  const translationPath = buildTranslationPath(
    pathSegments,
    sectionI18nPrefix,
    formContext,
  );
  const fieldPath = fieldPathId.path;
  const overrides = formContext?.overrides;
  const baselineFormData = formContext?.baselineFormData;
  const normalizedFieldPath = normalizeOverridePath(
    fieldPath,
    formContext?.formData,
  );
  let baselineValue = baselineFormData
    ? get(baselineFormData, normalizedFieldPath)
    : undefined;
  if (baselineValue === undefined || baselineValue === null) {
    if (schema.default !== undefined && schema.default !== null) {
      baselineValue = schema.default;
    }
  }
  const isBaselineModified =
    baselineFormData !== undefined &&
    !isEqual(
      normalizeFieldValue(fieldFormData),
      normalizeFieldValue(baselineValue),
    );
  const isModified = baselineFormData
    ? isBaselineModified
    : hasOverrideAtPath(overrides, fieldPath, formContext?.formData);
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
  const restartRequired = formContext?.restartRequired;
  const defaultRequiresRestart = formContext?.requiresRestart ?? true;
  const fieldRequiresRestart = requiresRestartForFieldPath(
    normalizedFieldPath,
    restartRequired,
    defaultRequiresRestart,
  );

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
        return (
          <RenderComponent {...(spec.props ?? {})} formContext={formContext} />
        );
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

  const shouldRenderStandardLabel =
    displayLabel &&
    finalLabel &&
    !isBoolean &&
    !useSplitLayout &&
    !isMultiSchemaWrapper &&
    !isObjectField &&
    !isAdditionalProperty;

  const shouldRenderSplitLabel =
    displayLabel &&
    finalLabel &&
    !isMultiSchemaWrapper &&
    !isObjectField &&
    !isAdditionalProperty;

  const shouldRenderBooleanLabel = displayLabel && finalLabel;

  const renderDocsLink = (className?: string) => {
    if (!fieldDocsUrl || !shouldShowDescription) {
      return null;
    }

    return (
      <div
        className={cn(
          "flex items-center text-xs text-primary-variant",
          className,
        )}
      >
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
    );
  };

  const renderDescription = (className?: string) => {
    if (!finalDescription || !shouldShowDescription) {
      return null;
    }

    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {finalDescription}
      </p>
    );
  };

  const renderStandardLabel = () => {
    if (!shouldRenderStandardLabel) {
      return null;
    }

    return (
      <Label
        htmlFor={id}
        className={cn(
          "text-sm font-medium",
          isModified && "text-danger",
          errors && errors.props?.errors?.length > 0 && "text-destructive",
        )}
      >
        {finalLabel}
        {required && <span className="ml-1 text-destructive">*</span>}
        {fieldRequiresRestart && <RestartRequiredIndicator className="ml-2" />}
      </Label>
    );
  };

  const renderBooleanLabel = () => {
    if (!shouldRenderBooleanLabel) {
      return null;
    }

    return (
      <Label
        htmlFor={id}
        className={cn("text-sm font-medium", isModified && "text-danger")}
      >
        {finalLabel}
        {required && <span className="ml-1 text-destructive">*</span>}
        {fieldRequiresRestart && <RestartRequiredIndicator className="ml-2" />}
      </Label>
    );
  };

  const renderSplitLabel = () => {
    if (!shouldRenderSplitLabel) {
      return null;
    }

    return (
      <Label
        htmlFor={id}
        className={cn(
          "text-sm font-medium",
          isModified && "text-danger",
          errors && errors.props?.errors?.length > 0 && "text-destructive",
        )}
      >
        {finalLabel}
        {required && <span className="ml-1 text-destructive">*</span>}
        {fieldRequiresRestart && <RestartRequiredIndicator className="ml-2" />}
      </Label>
    );
  };

  const renderBooleanSplitLayout = () => (
    <>
      <div className="space-y-1.5 md:hidden">
        <div className="flex items-center justify-between gap-4">
          {renderBooleanLabel()}
          <div className="flex items-center gap-2">{children}</div>
        </div>
        {renderDescription()}
        {renderDocsLink()}
      </div>

      <div className={cn("hidden md:grid", SPLIT_ROW_CLASS_NAME)}>
        <div className="space-y-0.5">
          {renderBooleanLabel()}
          {renderDescription()}
          {renderDocsLink()}
        </div>
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-2">{children}</div>
        </div>
      </div>
    </>
  );

  const renderBooleanInlineLayout = () => (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="space-y-0.5">
        {renderBooleanLabel()}
        {renderDescription()}
        {renderDocsLink()}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );

  const renderSplitValueLayout = () => (
    <div className={cn(SPLIT_ROW_CLASS_NAME, "space-y-1.5 md:space-y-3")}>
      <div className="space-y-1.5">
        {renderSplitLabel()}
        {renderDescription("hidden md:block")}
        {renderDocsLink("hidden md:flex")}
      </div>

      <div className="w-full max-w-2xl space-y-1">
        {children}
        {renderDescription("md:hidden")}
        {renderDocsLink("md:hidden")}
      </div>
    </div>
  );

  const renderDefaultValueLayout = () => (
    <>
      {children}
      {renderDescription()}
      {renderDocsLink()}
    </>
  );

  const renderFieldLayout = () => {
    if (isBoolean) {
      return useSplitBooleanLayout
        ? renderBooleanSplitLayout()
        : renderBooleanInlineLayout();
    }

    if (useSplitLayout) {
      return renderSplitValueLayout();
    }

    return renderDefaultValueLayout();
  };

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
        <div className={cn("space-y-1")} data-field-id={translationPath}>
          {renderStandardLabel()}
          {renderFieldLayout()}

          {errors}
          {help}
        </div>
        {afterContent}
      </div>
    </WrapIfAdditionalTemplate>
  );
}
