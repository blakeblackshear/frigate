import type {
  ErrorSchema,
  FieldProps,
  RJSFSchema,
  UiSchema,
} from "@rjsf/utils";
import { toFieldPathId } from "@rjsf/utils";
import { cloneDeep } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuChevronDown,
  LuChevronRight,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import { applySchemaDefaults } from "@/lib/config-schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConfigFormContext } from "@/types/configForm";
import useSWR from "swr";
import { DetectionHardware } from "@/types/hardware";
import { summarizeDevices } from "@/utils/detectionHardware";
import { HardwarePicker } from "./HardwarePicker";
import { ModelSourcePicker } from "./ModelSourcePicker";

type DetectionModel = {
  scene?: string;
  devices?: string[];
  [key: string]: unknown;
};

// scene and devices get dedicated controls; everything else is the model itself
const CUSTOM_MODEL_FIELDS = [
  "path",
  "labelmap_path",
  "width",
  "height",
  "input_pixel_format",
  "input_tensor",
  "input_dtype",
  "model_type",
];

/** The detector a model runs on, which is the prefix of its device strings. */
const detectorForModel = (model: DetectionModel): string | undefined =>
  model.devices?.[0]?.split(":")[0];

const asModelList = (formData: unknown): DetectionModel[] => {
  if (!Array.isArray(formData)) {
    return [];
  }

  return formData.filter(
    (item): item is DetectionModel => typeof item === "object" && item !== null,
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

const getSceneOptions = (itemSchema: RJSFSchema | undefined): string[] => {
  const scene = getItemProperties(itemSchema).scene as
    | Record<string, unknown>
    | undefined;
  const values = scene?.enum;

  return Array.isArray(values)
    ? values.filter((v): v is string => typeof v === "string")
    : [];
};

export function ModelsField(props: FieldProps) {
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

  const { t } = useTranslation(["views/settings", "common"]);
  const formContext = registry?.formContext as ConfigFormContext | undefined;

  const models = useMemo(() => asModelList(formData), [formData]);
  const itemSchema = useMemo(
    () => getItemSchema(schema as RJSFSchema),
    [schema],
  );
  const itemProperties = useMemo(
    () => getItemProperties(itemSchema),
    [itemSchema],
  );
  const itemUiSchema = useMemo(
    () =>
      ((uiSchema as { items?: UiSchema } | undefined)?.items ?? {}) as UiSchema,
    [uiSchema],
  );
  const sceneOptions = useMemo(() => getSceneOptions(itemSchema), [itemSchema]);
  const SchemaField = registry.fields.SchemaField;

  const [openByIndex, setOpenByIndex] = useState<Record<number, boolean>>({});

  // shared with HardwarePicker through the SWR cache, so this is not a second
  // request
  const { data: hardware } = useSWR<DetectionHardware[]>("hardware/probe");

  useEffect(() => {
    setOpenByIndex((previous) => {
      const next: Record<number, boolean> = {};
      for (let index = 0; index < models.length; index += 1) {
        next[index] = previous[index] ?? true;
      }
      return next;
    });
  }, [models.length]);

  const cameras = formContext?.fullConfig?.cameras;
  const savedModels = formContext?.fullConfig?.models;

  // `plus` is a readonly field stripped from the form data, so read it from the
  // full config. Match on scene rather than index, which shifts when a model is
  // added or removed.
  const savedPlusForScene = useCallback(
    (scene: string | undefined) =>
      savedModels?.find((saved) => saved.scene === scene)?.plus,
    [savedModels],
  );

  // a model serves the cameras naming its scene, plus every camera that names
  // no scene at all when it is the "all" model
  const cameraCountForScene = useCallback(
    (scene: string | undefined): number => {
      if (!cameras) {
        return 0;
      }

      return Object.values(cameras).filter((camera) => {
        const cameraScene = camera?.detect?.scene;
        return cameraScene ? cameraScene === scene : scene === "all";
      }).length;
    },
    [cameras],
  );

  const claimedByOtherModels = useCallback(
    (index: number): Record<string, string> => {
      const claimed: Record<string, string> = {};

      models.forEach((model, currentIndex) => {
        if (currentIndex === index) {
          return;
        }

        (model.devices ?? []).forEach((device) => {
          claimed[device] = model.scene ?? String(currentIndex + 1);
        });
      });

      return claimed;
    },
    [models],
  );

  const updateModel = useCallback(
    (index: number, partial: Partial<DetectionModel>) => {
      const next = cloneDeep(models);
      next[index] = { ...next[index], ...partial };
      onChange(next, fieldPathId.path);
    },
    [models, onChange, fieldPathId.path],
  );

  const handleAddModel = useCallback(() => {
    const base = itemSchema
      ? (applySchemaDefaults(itemSchema) as DetectionModel)
      : ({} as DetectionModel);
    const taken = new Set(models.map((model) => model.scene));
    const scene = sceneOptions.find((option) => !taken.has(option));

    onChange([...models, { ...base, scene, devices: [] }], fieldPathId.path);
    setOpenByIndex((previous) => ({ ...previous, [models.length]: true }));
  }, [models, itemSchema, sceneOptions, onChange, fieldPathId.path]);

  const handleRemoveModel = useCallback(
    (index: number) => {
      onChange(
        models.filter((_, currentIndex) => currentIndex !== index),
        fieldPathId.path,
      );

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
    [models, onChange, fieldPathId.path],
  );

  const renderField = useCallback(
    (index: number, fieldName: string) => {
      const fieldSchema = itemProperties[fieldName];

      if (!SchemaField || !fieldSchema) {
        return null;
      }

      const itemFieldPathId = toFieldPathId(
        fieldName,
        registry.globalFormOptions,
        [...fieldPathId.path, index],
      );
      const itemErrors = (
        errorSchema as Record<string, ErrorSchema> | undefined
      )?.[index] as Record<string, ErrorSchema> | undefined;

      return (
        <SchemaField
          key={fieldName}
          name={fieldName}
          schema={fieldSchema}
          uiSchema={(itemUiSchema[fieldName] as UiSchema | undefined) ?? {}}
          fieldPathId={itemFieldPathId}
          formData={(models[index] as Record<string, unknown>)?.[fieldName]}
          errorSchema={itemErrors?.[fieldName]}
          onChange={(nextValue: unknown) =>
            updateModel(index, { [fieldName]: nextValue })
          }
          onBlur={onBlur}
          onFocus={onFocus}
          registry={registry}
          disabled={disabled}
          readonly={readonly}
          hideError={hideError}
        />
      );
    },
    [
      SchemaField,
      itemProperties,
      itemUiSchema,
      models,
      registry,
      fieldPathId.path,
      errorSchema,
      updateModel,
      onBlur,
      onFocus,
      disabled,
      readonly,
      hideError,
    ],
  );

  const baseId = idSchema?.$id ?? "models";

  return (
    <div className="space-y-3">
      {models.map((model, index) => {
        const open = openByIndex[index] ?? true;
        const takenScenes = new Set(
          models
            .filter((_, currentIndex) => currentIndex !== index)
            .map((other) => other.scene),
        );

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
                      <span>
                        {t(`detectionModels.scenes.${model.scene ?? "all"}`)}
                      </span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {summarizeDevices(
                          hardware ?? [],
                          model.devices ?? [],
                        ) ?? t("detectionModels.hardware.none")}
                      </span>
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
                  <div className="space-y-1">
                    <Label>{t("detectionModels.scene.label")}</Label>
                    <Select
                      value={model.scene ?? ""}
                      onValueChange={(scene) => updateModel(index, { scene })}
                      disabled={disabled || readonly}
                    >
                      <SelectTrigger className="max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sceneOptions.map((scene) => (
                          <SelectItem
                            key={scene}
                            value={scene}
                            disabled={takenScenes.has(scene)}
                          >
                            {t(`detectionModels.scenes.${scene}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t("detectionModels.scene.description")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("detectionModels.scene.cameras", {
                        count: cameraCountForScene(model.scene),
                      })}
                    </p>
                  </div>

                  <HardwarePicker
                    idPrefix={`${baseId}-${index}`}
                    devices={model.devices ?? []}
                    claimedElsewhere={claimedByOtherModels(index)}
                    cameraCount={cameraCountForScene(model.scene)}
                    disabled={disabled || readonly}
                    onChange={(devices) => updateModel(index, { devices })}
                  />

                  <ModelSourcePicker
                    path={model.path}
                    plus={savedPlusForScene(model.scene)}
                    detector={detectorForModel(model)}
                    disabled={disabled || readonly}
                    onPathChange={(path) => updateModel(index, { path })}
                    customFields={CUSTOM_MODEL_FIELDS.map((fieldName) =>
                      renderField(index, fieldName),
                    )}
                  />

                  {models.length > 1 ? (
                    <div className="flex justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveModel(index)}
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
                  ) : null}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {models.length < sceneOptions.length ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddModel}
          disabled={disabled || readonly}
          className="gap-2"
        >
          <LuPlus className="h-4 w-4" />
          {t("detectionModels.addModel")}
        </Button>
      ) : null}
    </div>
  );
}

export default ModelsField;
