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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConfigFormContext } from "@/types/configForm";
import useSWR from "swr";
import { DetectionHardware } from "@/types/hardware";
import { summarizeDevices } from "@/utils/detectionHardware";
import { DEFAULT_SCENE, getSceneLabel } from "@/utils/modelUtil";
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

/**
 * The fields a model can edit. A Frigate+ model's size, format, type, and
 * labels come from its model info, so only its path stays editable.
 */
const editableFields = (model: DetectionModel): string[] =>
  typeof model.path === "string" && model.path.startsWith("plus://")
    ? ["path"]
    : CUSTOM_MODEL_FIELDS;

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
  const SchemaField = registry.fields.SchemaField;

  const [openByIndex, setOpenByIndex] = useState<Record<number, boolean>>({});
  // scenes are edited in place, so cards need a key that survives a rename and
  // doesn't hand a deleted card's state (such as the model source tab) to the
  // next one
  const [cardKeys, setCardKeys] = useState<number[]>(() =>
    models.map((_, index) => index),
  );

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
    setCardKeys((previous) => {
      if (previous.length === models.length) {
        return previous;
      }

      const next = previous.slice(0, models.length);
      let key = Math.max(-1, ...previous);
      while (next.length < models.length) {
        key += 1;
        next.push(key);
      }
      return next;
    });
  }, [models.length]);

  const cameras = formContext?.fullConfig?.cameras;
  const savedModels = formContext?.fullConfig?.models;

  // `plus` is a readonly field stripped from the form data, so read it from the
  // full config. Match on path rather than index, which shifts when a model is
  // added or removed, or scene, which can be renamed.
  const savedPlusForPath = useCallback(
    (path: unknown) =>
      typeof path === "string"
        ? savedModels?.find((saved) => saved.path === path)?.plus
        : undefined,
    [savedModels],
  );

  // a model serves the cameras naming its scene, and like the backend, the
  // default model also serves every camera whose scene has no model of its own
  const cameraCountForScene = useCallback(
    (scene: string | undefined): number => {
      if (!cameras) {
        return 0;
      }

      const modelScenes = new Set(
        models.map((model) => model.scene ?? DEFAULT_SCENE),
      );

      return Object.values(cameras).filter((camera) => {
        const cameraScene = camera?.detect?.scene ?? DEFAULT_SCENE;
        const servedBy = modelScenes.has(cameraScene)
          ? cameraScene
          : DEFAULT_SCENE;
        return servedBy === (scene ?? DEFAULT_SCENE);
      }).length;
    },
    [cameras, models],
  );

  const claimedByOtherModels = useCallback(
    (index: number): Record<string, string> => {
      const claimed: Record<string, string> = {};

      models.forEach((model, currentIndex) => {
        if (currentIndex === index) {
          return;
        }

        (model.devices ?? []).forEach((device) => {
          claimed[device] = model.scene
            ? getSceneLabel(t, model.scene)
            : String(currentIndex + 1);
        });
      });

      return claimed;
    },
    [models, t],
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
    // the default scene is almost always taken, so leave the new model's
    // scene for the user to name
    onChange(
      [...models, { ...base, scene: "", devices: [] }],
      fieldPathId.path,
    );
    setOpenByIndex((previous) => ({ ...previous, [models.length]: true }));
    setCardKeys((previous) => [...previous, Math.max(-1, ...previous) + 1]);
  }, [models, itemSchema, onChange, fieldPathId.path]);

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
      setCardKeys((previous) =>
        previous.filter((_, currentIndex) => currentIndex !== index),
      );
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
    <div className="space-y-4">
      {models.map((model, index) => {
        const open = openByIndex[index] ?? true;
        const sceneErrors = (
          (errorSchema as Record<string, ErrorSchema> | undefined)?.[index] as
            Record<string, ErrorSchema> | undefined
        )?.scene?.__errors;

        return (
          <Card
            key={`${baseId}-${cardKeys[index] ?? index}`}
            className="w-full"
          >
            <Collapsible
              open={open}
              onOpenChange={(nextOpen) =>
                setOpenByIndex((previous) => ({
                  ...previous,
                  [index]: nextOpen,
                }))
              }
            >
              <CardHeader className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <CollapsibleTrigger asChild>
                    <CardTitle className="flex-1 cursor-pointer text-sm">
                      <span>{getSceneLabel(t, model.scene)}</span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {summarizeDevices(
                          hardware ?? [],
                          model.devices ?? [],
                        ) ?? t("detectionModels.hardware.none")}
                        {" • "}
                        {t("detectionModels.cameras", {
                          count: cameraCountForScene(model.scene),
                        })}
                      </span>
                    </CardTitle>
                  </CollapsibleTrigger>
                  <div className="flex shrink-0 items-center gap-1">
                    {models.length > 1 ? (
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
                    ) : null}
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t(
                          open ? "button.collapse" : "button.expand",
                          { ns: "common" },
                        )}
                      >
                        {open ? (
                          <LuChevronDown className="h-4 w-4" />
                        ) : (
                          <LuChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="space-y-6 p-4 pt-0">
                  <div className="space-y-1">
                    <Label htmlFor={`${baseId}-${index}-scene`}>
                      {t("detectionModels.scene.label")}
                    </Label>
                    <Input
                      id={`${baseId}-${index}-scene`}
                      className="max-w-xs"
                      value={model.scene ?? ""}
                      placeholder={t("detectionModels.scene.placeholder")}
                      onChange={(event) =>
                        updateModel(index, { scene: event.target.value.trim() })
                      }
                      disabled={disabled || readonly}
                    />
                    {!hideError && sceneErrors?.length ? (
                      <p className="text-xs text-destructive">
                        {sceneErrors.join(", ")}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {t("detectionModels.scene.description")}
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
                    plus={savedPlusForPath(model.path)}
                    detector={detectorForModel(model)}
                    disabled={disabled || readonly}
                    onPathChange={(path) => updateModel(index, { path })}
                    customFields={editableFields(model).map((fieldName) =>
                      renderField(index, fieldName),
                    )}
                  />
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
        onClick={handleAddModel}
        disabled={disabled || readonly}
        className="gap-2"
      >
        <LuPlus className="h-4 w-4" />
        {t("detectionModels.addModel")}
      </Button>
    </div>
  );
}

export default ModelsField;
