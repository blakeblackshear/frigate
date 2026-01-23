// ConfigForm - Main RJSF form wrapper component
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type { IChangeEvent } from "@rjsf/core";
import { frigateTheme } from "./theme";
import { transformSchema } from "@/lib/config-schema";
import { createErrorTransformer } from "@/lib/config-schema/errorMessages";
import { useMemo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface ConfigFormProps {
  /** JSON Schema for the form */
  schema: RJSFSchema;
  /** Current form data */
  formData?: Record<string, unknown>;
  /** Called when form data changes */
  onChange?: (data: Record<string, unknown>) => void;
  /** Called when form is submitted */
  onSubmit?: (data: Record<string, unknown>) => void;
  /** Called when form has errors on submit */
  onError?: (errors: unknown[]) => void;
  /** Additional uiSchema overrides */
  uiSchema?: UiSchema;
  /** Field ordering */
  fieldOrder?: string[];
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
  formContext?: Record<string, unknown>;
  /** i18n namespace for field labels */
  i18nNamespace?: string;
}

export function ConfigForm({
  schema,
  formData,
  onChange,
  onSubmit,
  onError,
  uiSchema: customUiSchema,
  fieldOrder,
  hiddenFields,
  advancedFields,
  disabled = false,
  readonly = false,
  showSubmit = true,
  className,
  liveValidate = false,
  formContext,
  i18nNamespace,
}: ConfigFormProps) {
  const { t } = useTranslation([i18nNamespace || "common", "views/settings"]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Determine which fields to hide based on advanced toggle
  const effectiveHiddenFields = useMemo(() => {
    if (showAdvanced || !advancedFields || advancedFields.length === 0) {
      return hiddenFields;
    }
    // Hide advanced fields when toggle is off
    return [...(hiddenFields || []), ...advancedFields];
  }, [hiddenFields, advancedFields, showAdvanced]);

  // Transform schema and generate uiSchema
  const { schema: transformedSchema, uiSchema: generatedUiSchema } = useMemo(
    () =>
      transformSchema(schema, {
        fieldOrder,
        hiddenFields: effectiveHiddenFields,
        advancedFields: showAdvanced ? advancedFields : [],
        i18nNamespace,
      }),
    [
      schema,
      fieldOrder,
      effectiveHiddenFields,
      advancedFields,
      showAdvanced,
      i18nNamespace,
    ],
  );

  // Merge generated uiSchema with custom overrides
  const finalUiSchema = useMemo(
    () => ({
      ...generatedUiSchema,
      ...customUiSchema,
      "ui:submitButtonOptions": showSubmit
        ? { norender: false }
        : { norender: true },
    }),
    [generatedUiSchema, customUiSchema, showSubmit],
  );

  // Create error transformer for user-friendly error messages
  const errorTransformer = useMemo(() => createErrorTransformer(), []);

  const handleChange = useCallback(
    (e: IChangeEvent) => {
      onChange?.(e.formData);
    },
    [onChange],
  );

  const handleSubmit = useCallback(
    (e: IChangeEvent) => {
      onSubmit?.(e.formData);
    },
    [onSubmit],
  );

  const hasAdvancedFields = advancedFields && advancedFields.length > 0;

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
    <div className={cn("config-form", className)}>
      {hasAdvancedFields && (
        <div className="mb-4 flex items-center justify-end gap-2">
          <Switch
            id="show-advanced"
            checked={showAdvanced}
            onCheckedChange={setShowAdvanced}
          />
          <Label
            htmlFor="show-advanced"
            className="cursor-pointer text-sm text-muted-foreground"
          >
            {t("configForm.showAdvanced", {
              ns: "views/settings",
              defaultValue: "Show Advanced Settings",
            })}
          </Label>
        </div>
      )}
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
        {...frigateTheme}
      />
    </div>
  );
}

export default ConfigForm;
