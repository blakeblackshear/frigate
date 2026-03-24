import type {
  ErrorSchema,
  FieldProps,
  RJSFSchema,
  UiSchema,
} from "@rjsf/utils";
import { toFieldPathId } from "@rjsf/utils";
import { cloneDeep, isEqual } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { applySchemaDefaults } from "@/lib/config-schema";
import { mergeUiSchema } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LuChevronDown,
  LuChevronRight,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import type { ConfigFormContext } from "@/types/configForm";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FfmpegInput = {
  path?: string;
  roles?: string[];
  hwaccel_args?: unknown;
};

const asInputList = (formData: unknown): FfmpegInput[] => {
  if (!Array.isArray(formData)) {
    return [];
  }

  return formData.filter(
    (item): item is FfmpegInput => typeof item === "object" && item !== null,
  );
};

const getItemSchema = (schema: RJSFSchema): RJSFSchema | undefined => {
  const items = schema.items;
  if (!items || typeof items !== "object" || Array.isArray(items)) {
    return undefined;
  }

  return items as RJSFSchema;
};

const getItemProperties = (
  schema: RJSFSchema | undefined,
): Record<string, RJSFSchema> => {
  if (!schema || typeof schema.properties !== "object" || !schema.properties) {
    return {};
  }

  return schema.properties as Record<string, RJSFSchema>;
};

const hasDetectRole = (input: FfmpegInput): boolean =>
  Array.isArray(input.roles) && input.roles.includes("detect");

const hasHwaccelValue = (value: unknown): boolean => {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
};

const normalizeNonDetectHwaccel = (inputs: FfmpegInput[]): FfmpegInput[] =>
  inputs.map((input) => {
    if (hasDetectRole(input)) {
      return input;
    }

    if (!hasHwaccelValue(input.hwaccel_args)) {
      return input;
    }

    return {
      ...input,
      hwaccel_args: undefined,
    };
  });

export function CameraInputsField(props: FieldProps) {
  const {
    schema,
    uiSchema,
    formData,
    onChange,
    fieldPathId,
    registry,
    idSchema,
    errorSchema,
    disabled,
    readonly,
    hideError,
    onBlur,
    onFocus,
  } = props;

  const formContext = registry?.formContext as ConfigFormContext | undefined;
  const isCameraLevel = formContext?.level === "camera";
  const effectiveNamespace = isCameraLevel ? "config/cameras" : "config/global";

  const { t, i18n } = useTranslation([
    "common",
    "views/settings",
    effectiveNamespace,
  ]);

  const inputs = useMemo(() => asInputList(formData), [formData]);
  const arraySchema = schema as RJSFSchema;
  const itemSchema = useMemo(() => getItemSchema(arraySchema), [arraySchema]);
  const itemProperties = useMemo(
    () => getItemProperties(itemSchema),
    [itemSchema],
  );
  const itemUiSchema = useMemo(
    () =>
      ((uiSchema as { items?: UiSchema } | undefined)?.items ?? {}) as UiSchema,
    [uiSchema],
  );
  const SchemaField = registry.fields.SchemaField;

  const [openByIndex, setOpenByIndex] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setOpenByIndex((previous) => {
      const next: Record<number, boolean> = {};
      for (let index = 0; index < inputs.length; index += 1) {
        next[index] = previous[index] ?? true;
      }
      return next;
    });
  }, [inputs.length]);

  useEffect(() => {
    const normalized = normalizeNonDetectHwaccel(inputs);
    if (!isEqual(normalized, inputs)) {
      onChange(normalized, fieldPathId.path);
    }
  }, [fieldPathId.path, inputs, onChange]);

  const handleFieldValueChange = useCallback(
    (index: number, fieldName: string, nextValue: unknown) => {
      const nextInputs = cloneDeep(inputs);
      const item =
        (nextInputs[index] as Record<string, unknown> | undefined) ??
        ({} as Record<string, unknown>);

      item[fieldName] = nextValue;
      nextInputs[index] = item;

      onChange(normalizeNonDetectHwaccel(nextInputs), fieldPathId.path);
    },
    [fieldPathId.path, inputs, onChange],
  );

  const handleAddInput = useCallback(() => {
    const base = itemSchema
      ? (applySchemaDefaults(itemSchema) as FfmpegInput)
      : ({} as FfmpegInput);
    const nextInputs = normalizeNonDetectHwaccel([...inputs, base]);
    onChange(nextInputs, fieldPathId.path);
    setOpenByIndex((previous) => ({ ...previous, [inputs.length]: true }));
  }, [fieldPathId.path, inputs, itemSchema, onChange]);

  const handleRemoveInput = useCallback(
    (index: number) => {
      const nextInputs = inputs.filter(
        (_, currentIndex) => currentIndex !== index,
      );
      onChange(nextInputs, fieldPathId.path);
      setOpenByIndex((previous) => {
        const next: Record<number, boolean> = {};
        Object.entries(previous).forEach(([key, value]) => {
          const current = Number(key);
          if (Number.isNaN(current) || current === index) {
            return;
          }

          next[current > index ? current - 1 : current] = value;
        });
        return next;
      });
    },
    [fieldPathId.path, inputs, onChange],
  );

  const renderField = useCallback(
    (
      index: number,
      fieldName: string,
      options?: {
        extraUiSchema?: UiSchema;
        showSchemaDescription?: boolean;
      },
    ) => {
      if (!SchemaField) {
        return null;
      }

      const fieldSchema = itemProperties[fieldName];
      if (!fieldSchema) {
        return null;
      }

      const itemData = inputs[index] as Record<string, unknown>;
      const itemPath = [...fieldPathId.path, index];
      const itemFieldPathId = toFieldPathId(
        fieldName,
        registry.globalFormOptions,
        itemPath,
      );

      const itemErrors = (
        errorSchema as Record<string, ErrorSchema> | undefined
      )?.[index] as Record<string, ErrorSchema> | undefined;
      const fieldErrorSchema = itemErrors?.[fieldName];

      const baseUiSchema =
        (itemUiSchema[fieldName] as UiSchema | undefined) ?? ({} as UiSchema);
      const mergedUiSchema = options?.extraUiSchema
        ? mergeUiSchema(baseUiSchema, options.extraUiSchema)
        : baseUiSchema;

      const fieldTranslationDescriptionKey = `ffmpeg.inputs.${fieldName}.description`;
      const translatedDescription = i18n.exists(
        fieldTranslationDescriptionKey,
        {
          ns: effectiveNamespace,
        },
      )
        ? t(fieldTranslationDescriptionKey, { ns: effectiveNamespace })
        : "";

      const fieldDescription =
        typeof fieldSchema.description === "string" &&
        fieldSchema.description.length > 0
          ? fieldSchema.description
          : translatedDescription;

      const handleScopedFieldChange = (
        nextValue: unknown,
        _path: unknown,
        _errors?: ErrorSchema,
        _id?: string,
      ) => {
        handleFieldValueChange(index, fieldName, nextValue);
      };

      return (
        <div className="space-y-1">
          <SchemaField
            name={fieldName}
            schema={fieldSchema}
            uiSchema={mergedUiSchema}
            fieldPathId={itemFieldPathId}
            formData={itemData?.[fieldName]}
            errorSchema={fieldErrorSchema}
            onChange={handleScopedFieldChange}
            onBlur={onBlur}
            onFocus={onFocus}
            registry={registry}
            disabled={disabled}
            readonly={readonly}
            hideError={hideError}
          />
          {options?.showSchemaDescription && fieldDescription ? (
            <p className="text-xs text-muted-foreground">{fieldDescription}</p>
          ) : null}
        </div>
      );
    },
    [
      SchemaField,
      itemProperties,
      inputs,
      fieldPathId.path,
      registry,
      errorSchema,
      itemUiSchema,
      i18n,
      handleFieldValueChange,
      effectiveNamespace,
      onBlur,
      onFocus,
      disabled,
      readonly,
      hideError,
      t,
    ],
  );

  const baseId = idSchema?.$id ?? "ffmpeg_inputs";

  return (
    <div className="space-y-3">
      {inputs.map((input, index) => {
        const open = openByIndex[index] ?? true;
        const itemTitle = t("configForm.cameraInputs.itemTitle", {
          ns: "views/settings",
          index: index + 1,
        });
        const itemPath =
          typeof input.path === "string" ? input.path.trim() : "";

        return (
          <Card key={`${baseId}-${index}`} className="w-full">
            <Collapsible
              open={open}
              onOpenChange={(nextOpen) =>
                setOpenByIndex((previous) => ({
                  ...previous,
                  [index]: nextOpen,
                }))
              }
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-sm">
                      <span>{itemTitle}</span>
                      {itemPath ? (
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          {itemPath}
                        </span>
                      ) : null}
                    </CardTitle>
                    {open ? (
                      <LuChevronDown className="h-4 w-4" />
                    ) : (
                      <LuChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="w-full">
                    {renderField(index, "path", {
                      extraUiSchema: {
                        "ui:widget": "CameraPathWidget",
                        "ui:options": {
                          size: "full",
                          splitLayout: false,
                        },
                      },
                      showSchemaDescription: true,
                    })}
                  </div>

                  <div className="w-full">{renderField(index, "roles")}</div>

                  {renderField(index, "input_args")}

                  {hasDetectRole(input)
                    ? renderField(index, "hwaccel_args", {
                        extraUiSchema: {
                          "ui:options": {
                            allowInherit: true,
                          },
                        },
                      })
                    : null}

                  {renderField(index, "output_args")}

                  <div className="flex justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveInput(index)}
                          disabled={disabled || readonly}
                          aria-label={t("button.delete", { ns: "common" })}
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("button.delete", { ns: "common" })}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddInput}
        disabled={disabled || readonly}
        className="gap-2"
      >
        <LuPlus className="h-4 w-4" />
        {t("button.add", { ns: "common" })}
      </Button>
    </div>
  );
}

export default CameraInputsField;
