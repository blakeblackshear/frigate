// ConfigForm - Main RJSF form wrapper component
import Form from "@rjsf/shadcn";
import validator from "@rjsf/validator-ajv8";
import type { FormValidation, RJSFSchema, UiSchema } from "@rjsf/utils";
import type { IChangeEvent } from "@rjsf/core";
import { frigateTheme } from "./theme";
import { transformSchema } from "@/lib/config-schema";
import { createErrorTransformer } from "@/lib/config-schema/errorMessages";
import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn, mergeUiSchema } from "@/lib/utils";
import type { ConfigFormContext } from "@/types/configForm";

type SchemaWithProperties = RJSFSchema & {
  properties: Record<string, RJSFSchema>;
};

type SchemaWithAdditionalProperties = RJSFSchema & {
  additionalProperties: RJSFSchema;
};

// Runtime guards for schema fragments
const hasSchemaProperties = (
  schema: RJSFSchema,
): schema is SchemaWithProperties =>
  typeof schema === "object" &&
  schema !== null &&
  typeof schema.properties === "object" &&
  schema.properties !== null;

const hasSchemaAdditionalProperties = (
  schema: RJSFSchema,
): schema is SchemaWithAdditionalProperties =>
  typeof schema === "object" &&
  schema !== null &&
  typeof schema.additionalProperties === "object" &&
  schema.additionalProperties !== null;

// Detects path-style uiSchema keys (e.g., "filters.*.mask")
const isPathKey = (key: string) => key.includes(".") || key.includes("*");

type UiSchemaPathOverride = {
  path: string[];
  value: UiSchema;
};

// Split uiSchema into normal keys vs path-based overrides
const splitUiSchemaOverrides = (
  uiSchema?: UiSchema,
): { baseUiSchema?: UiSchema; pathOverrides: UiSchemaPathOverride[] } => {
  if (!uiSchema) {
    return { baseUiSchema: undefined, pathOverrides: [] };
  }

  const baseUiSchema: UiSchema = {};
  const pathOverrides: UiSchemaPathOverride[] = [];

  Object.entries(uiSchema).forEach(([key, value]) => {
    if (isPathKey(key)) {
      pathOverrides.push({
        path: key.split("."),
        value: value as UiSchema,
      });
    } else {
      baseUiSchema[key] = value as UiSchema;
    }
  });

  return { baseUiSchema, pathOverrides };
};

// Apply wildcard path overrides to uiSchema using the schema structure
const applyUiSchemaPathOverrides = (
  uiSchema: UiSchema,
  schema: RJSFSchema,
  overrides: UiSchemaPathOverride[],
): UiSchema => {
  if (overrides.length === 0) {
    return uiSchema;
  }

  // Recursively apply a path override; supports "*" to match any property.
  const applyOverride = (
    targetUi: UiSchema,
    targetSchema: RJSFSchema,
    path: string[],
    value: UiSchema,
  ) => {
    if (path.length === 0) {
      Object.assign(targetUi, mergeUiSchema(targetUi, value));
      return;
    }

    const [segment, ...rest] = path;
    const schemaObj = targetSchema;

    if (segment === "*") {
      if (hasSchemaProperties(schemaObj)) {
        Object.entries(schemaObj.properties).forEach(
          ([propertyName, propertySchema]) => {
            const existing =
              (targetUi[propertyName] as UiSchema | undefined) || {};
            targetUi[propertyName] = { ...existing };
            applyOverride(
              targetUi[propertyName] as UiSchema,
              propertySchema,
              rest,
              value,
            );
          },
        );
      } else if (hasSchemaAdditionalProperties(schemaObj)) {
        // For dict schemas, apply override to additionalProperties
        const existing =
          (targetUi.additionalProperties as UiSchema | undefined) || {};
        targetUi.additionalProperties = { ...existing };
        applyOverride(
          targetUi.additionalProperties as UiSchema,
          schemaObj.additionalProperties,
          rest,
          value,
        );
      }
      return;
    }

    if (hasSchemaProperties(schemaObj)) {
      const propertySchema = schemaObj.properties[segment];
      if (propertySchema) {
        const existing = (targetUi[segment] as UiSchema | undefined) || {};
        targetUi[segment] = { ...existing };
        applyOverride(
          targetUi[segment] as UiSchema,
          propertySchema,
          rest,
          value,
        );
      }
    }
  };

  const updated = { ...uiSchema };
  overrides.forEach(({ path, value }) => {
    applyOverride(updated, schema, path, value);
  });

  return updated;
};

const applyLayoutGridFieldDefaults = (uiSchema: UiSchema): UiSchema => {
  const applyDefaults = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map((item) => applyDefaults(item));
    }

    if (typeof node !== "object" || node === null) {
      return node;
    }

    const nextNode: Record<string, unknown> = {};

    Object.entries(node).forEach(([key, value]) => {
      nextNode[key] = applyDefaults(value);
    });

    if (
      Array.isArray(nextNode["ui:layoutGrid"]) &&
      nextNode["ui:field"] === undefined
    ) {
      nextNode["ui:field"] = "LayoutGridField";
    }

    return nextNode;
  };

  return applyDefaults(uiSchema) as UiSchema;
};

export interface ConfigFormProps {
  /** JSON Schema for the form */
  schema: RJSFSchema;
  /** Current form data */
  formData?: unknown;
  /** Called when form data changes */
  onChange?: (data: unknown) => void;
  /** Called when form is submitted */
  onSubmit?: (data: unknown) => void;
  /** Called when form has errors on submit */
  onError?: (errors: unknown[]) => void;
  /** Additional uiSchema overrides */
  uiSchema?: UiSchema;
  /** Field ordering */
  fieldOrder?: string[];
  /** Field groups for layout */
  fieldGroups?: Record<string, string[]>;
  /** Fields to hide */
  hiddenFields?: string[];
  /** Fields marked as advanced (collapsed by default) */
  advancedFields?: string[];
  /** Whether form is disabled */
  disabled?: boolean;
  /** Whether form is read-only */
  readonly?: boolean;
  /** Whether to show submit button */
  showSubmit?: boolean;
  /** Custom class name */
  className?: string;
  /** Live validation mode */
  liveValidate?: boolean;
  /** Form context passed to all widgets */
  formContext?: ConfigFormContext;
  /** i18n namespace for field labels */
  i18nNamespace?: string;
  /** Optional custom validation */
  customValidate?: (
    formData: unknown,
    errors: FormValidation,
  ) => FormValidation;
  /** Called whenever form validation state changes */
  onValidationChange?: (hasErrors: boolean) => void;
}

export function ConfigForm({
  schema,
  formData,
  onChange,
  onSubmit,
  onError,
  uiSchema: customUiSchema,
  fieldOrder,
  fieldGroups,
  hiddenFields,
  advancedFields,
  disabled = false,
  readonly = false,
  showSubmit = false,
  className,
  liveValidate = true,
  formContext,
  i18nNamespace,
  customValidate,
  onValidationChange,
}: ConfigFormProps) {
  const { t, i18n } = useTranslation([
    i18nNamespace || "common",
    "views/settings",
    "config/validation",
  ]);

  // Determine which fields to hide based on advanced toggle
  const effectiveHiddenFields = useMemo(() => {
    return hiddenFields;
  }, [hiddenFields]);

  // Transform schema and generate uiSchema
  const { schema: transformedSchema, uiSchema: generatedUiSchema } = useMemo(
    () =>
      transformSchema(schema, {
        fieldOrder,
        hiddenFields: effectiveHiddenFields,
        advancedFields: advancedFields,
        i18nNamespace,
      }),
    [schema, fieldOrder, effectiveHiddenFields, advancedFields, i18nNamespace],
  );

  const { baseUiSchema, pathOverrides } = useMemo(
    () => splitUiSchemaOverrides(customUiSchema),
    [customUiSchema],
  );

  // Merge generated uiSchema with custom overrides
  const finalUiSchema = useMemo(() => {
    // Start with generated schema
    const expandedUiSchema = applyUiSchemaPathOverrides(
      generatedUiSchema,
      transformedSchema,
      pathOverrides,
    );
    const merged = applyLayoutGridFieldDefaults(
      mergeUiSchema(expandedUiSchema, baseUiSchema),
    );

    // Add field groups
    if (fieldGroups) {
      merged["ui:groups"] = fieldGroups;
    }

    // Set submit button options
    merged["ui:submitButtonOptions"] = showSubmit
      ? { norender: false }
      : { norender: true };

    // Ensure hiddenFields take precedence over any custom uiSchema overrides
    // Build path-based overrides for hidden fields and apply them after merging
    if (hiddenFields && hiddenFields.length > 0) {
      const hiddenOverrides = hiddenFields.map((field) => ({
        path: field.split("."),
        value: { "ui:widget": "hidden" } as UiSchema,
      }));

      return applyUiSchemaPathOverrides(
        merged,
        transformedSchema,
        hiddenOverrides,
      );
    }

    return merged;
  }, [
    generatedUiSchema,
    transformedSchema,
    pathOverrides,
    baseUiSchema,
    showSubmit,
    fieldGroups,
    hiddenFields,
  ]);

  // Create error transformer for user-friendly error messages
  const errorTransformer = useMemo(() => createErrorTransformer(i18n), [i18n]);

  const handleChange = useCallback(
    (e: IChangeEvent) => {
      onValidationChange?.(Array.isArray(e.errors) && e.errors.length > 0);
      onChange?.(e.formData);
    },
    [onChange, onValidationChange],
  );

  const handleSubmit = useCallback(
    (e: IChangeEvent) => {
      onSubmit?.(e.formData);
    },
    [onSubmit],
  );

  // Extended form context with i18n info
  const extendedFormContext = useMemo(
    () => ({
      ...formContext,
      i18nNamespace,
      t,
    }),
    [formContext, i18nNamespace, t],
  );

  return (
    <div className={cn("config-form w-full max-w-5xl", className)}>
      <Form
        schema={transformedSchema}
        uiSchema={finalUiSchema}
        formData={formData}
        validator={validator}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onError={onError}
        disabled={disabled}
        readonly={readonly}
        liveValidate={liveValidate}
        formContext={extendedFormContext}
        transformErrors={errorTransformer}
        customValidate={customValidate}
        {...frigateTheme}
      />
    </div>
  );
}

export default ConfigForm;
