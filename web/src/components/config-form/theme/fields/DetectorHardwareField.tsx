import type {
  ErrorSchema,
  FieldPathList,
  FieldProps,
  RJSFSchema,
  UiSchema,
} from "@rjsf/utils";
import { toFieldPathId } from "@rjsf/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuChevronDown,
  LuChevronRight,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import { applySchemaDefaults } from "@/lib/config-schema";
import { cn, isJsonObject, mergeUiSchema } from "@/lib/utils";
import { ConfigFormContext, JsonObject } from "@/types/configForm";
import { requiresRestartForFieldPath } from "@/utils/configUtil";
import RestartRequiredIndicator from "@/components/indicators/RestartRequiredIndicator";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { humanizeKey } from "../utils/i18n";

type DetectorHardwareFieldOptions = {
  multiInstanceTypes?: string[];
  hiddenByType?: Record<string, string[]>;
  hiddenFields?: string[];
  typeOrder?: string[];
};

type DetectorSchemaEntry = {
  type: string;
  schema: RJSFSchema;
};

const DEFAULT_MULTI_INSTANCE_TYPES = ["cpu", "onnx", "openvino"];
const EMPTY_HIDDEN_BY_TYPE: Record<string, string[]> = {};
const EMPTY_HIDDEN_FIELDS: string[] = [];
const EMPTY_TYPE_ORDER: string[] = [];

const isSchemaObject = (schema: unknown): schema is RJSFSchema =>
  typeof schema === "object" && schema !== null;

const getUnionSchemas = (schema?: RJSFSchema): RJSFSchema[] => {
  if (!schema) {
    return [];
  }

  const schemaObj = schema as Record<string, unknown>;
  const union = schemaObj.oneOf ?? schemaObj.anyOf;
  if (Array.isArray(union)) {
    return union.filter(isSchemaObject) as RJSFSchema[];
  }

  return [schema];
};

const getTypeValues = (schema: RJSFSchema): string[] => {
  const schemaObj = schema as Record<string, unknown>;
  const properties = schemaObj.properties as
    | Record<string, unknown>
    | undefined;
  const typeSchema = properties?.type as Record<string, unknown> | undefined;
  const values: string[] = [];

  if (typeof typeSchema?.const === "string") {
    values.push(typeSchema.const);
  }

  if (Array.isArray(typeSchema?.enum)) {
    typeSchema.enum.forEach((value) => {
      if (typeof value === "string") {
        values.push(value);
      }
    });
  }

  return values;
};

const buildHiddenUiSchema = (paths: string[]): UiSchema => {
  const result: UiSchema = {};

  paths.forEach((path) => {
    if (!path) {
      return;
    }

    const segments = path.split(".").filter(Boolean);
    if (segments.length === 0) {
      return;
    }

    let cursor = result;
    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        cursor[segment] = {
          ...(cursor[segment] as UiSchema | undefined),
          "ui:widget": "hidden",
        } as UiSchema;
        return;
      }

      const existing = (cursor[segment] as UiSchema | undefined) ?? {};
      cursor[segment] = existing;
      cursor = existing;
    });
  });

  return result;
};

const getInstanceType = (value: unknown): string | undefined => {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const typeValue = value.type;
  return typeof typeValue === "string" && typeValue.length > 0
    ? typeValue
    : undefined;
};

export function DetectorHardwareField(props: FieldProps) {
  const {
    schema,
    uiSchema,
    registry,
    fieldPathId,
    formData: rawFormData,
    errorSchema,
    disabled,
    readonly,
    hideError,
    onBlur,
    onFocus,
    onChange,
  } = props;

  const formContext = registry.formContext as ConfigFormContext | undefined;
  const configNamespace =
    formContext?.i18nNamespace ??
    (formContext?.level === "camera" ? "config/cameras" : "config/global");
  const { t: fallbackT } = useTranslation(["common", configNamespace]);
  const t = formContext?.t ?? fallbackT;
  const sectionPrefix = formContext?.sectionI18nPrefix ?? "detectors";
  const restartRequired = formContext?.restartRequired;
  const defaultRequiresRestart = formContext?.requiresRestart ?? true;

  const options =
    (uiSchema?.["ui:options"] as DetectorHardwareFieldOptions | undefined) ??
    {};
  const multiInstanceTypes =
    options.multiInstanceTypes ?? DEFAULT_MULTI_INSTANCE_TYPES;
  const hiddenByType = options.hiddenByType ?? EMPTY_HIDDEN_BY_TYPE;
  const hiddenFields = options.hiddenFields ?? EMPTY_HIDDEN_FIELDS;
  const typeOrder = options.typeOrder ?? EMPTY_TYPE_ORDER;
  const multiInstanceSet = useMemo(
    () => new Set(multiInstanceTypes),
    [multiInstanceTypes],
  );
  const globalHiddenFields = useMemo(
    () =>
      hiddenFields
        .map((path) => (path.startsWith("*.") ? path.slice(2) : path))
        .filter((path) => path.length > 0),
    [hiddenFields],
  );

  const detectorConfigSchema = useMemo(() => {
    const additional = (schema as RJSFSchema | undefined)?.additionalProperties;
    if (isSchemaObject(additional)) {
      return additional as RJSFSchema;
    }

    const rootSchema = registry.rootSchema as Record<string, unknown>;
    const defs =
      (rootSchema?.$defs as Record<string, unknown> | undefined) ??
      (rootSchema?.definitions as Record<string, unknown> | undefined);
    const fallback = defs?.DetectorConfig;

    return isSchemaObject(fallback) ? (fallback as RJSFSchema) : undefined;
  }, [schema, registry.rootSchema]);

  const detectorSchemas = useMemo<DetectorSchemaEntry[]>(() => {
    const entries: DetectorSchemaEntry[] = [];
    getUnionSchemas(detectorConfigSchema).forEach((schema) => {
      const types = getTypeValues(schema);
      types.forEach((type) => {
        entries.push({ type, schema });
      });
    });
    return entries;
  }, [detectorConfigSchema]);

  const detectorSchemaByType = useMemo(() => {
    const map = new Map<string, RJSFSchema>();
    detectorSchemas.forEach(({ type, schema }) => {
      if (!map.has(type)) {
        map.set(type, schema);
      }
    });
    return map;
  }, [detectorSchemas]);

  const availableTypes = useMemo(
    () => detectorSchemas.map((entry) => entry.type),
    [detectorSchemas],
  );

  const orderedTypes = useMemo(() => {
    if (!typeOrder.length) {
      return availableTypes;
    }

    const availableSet = new Set(availableTypes);
    const ordered = typeOrder.filter((type) => availableSet.has(type));
    const orderedSet = new Set(ordered);
    const remaining = availableTypes.filter((type) => !orderedSet.has(type));
    return [...ordered, ...remaining];
  }, [availableTypes, typeOrder]);

  const formData = isJsonObject(rawFormData) ? rawFormData : {};
  const detectors = formData as JsonObject;

  const [addType, setAddType] = useState<string | undefined>(orderedTypes[0]);
  const [addError, setAddError] = useState<string | undefined>();
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [renameErrors, setRenameErrors] = useState<Record<string, string>>({});
  const [typeErrors, setTypeErrors] = useState<Record<string, string>>({});
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set(Object.keys(detectors)),
  );

  useEffect(() => {
    if (!orderedTypes.length) {
      setAddType(undefined);
      return;
    }

    if (!addType || !orderedTypes.includes(addType)) {
      setAddType(orderedTypes[0]);
    }
  }, [orderedTypes, addType]);

  useEffect(() => {
    setOpenKeys((prev) => {
      const next = new Set<string>();
      Object.keys(detectors).forEach((key) => {
        if (prev.has(key)) {
          next.add(key);
        }
      });
      return next;
    });

    setRenameDrafts((prev) => {
      const next: Record<string, string> = {};
      Object.keys(detectors).forEach((key) => {
        if (prev[key] !== undefined) {
          next[key] = prev[key];
        }
      });
      return next;
    });

    setRenameErrors((prev) => {
      const next: Record<string, string> = {};
      Object.keys(detectors).forEach((key) => {
        if (prev[key] !== undefined) {
          next[key] = prev[key];
        }
      });
      return next;
    });

    setTypeErrors((prev) => {
      const next: Record<string, string> = {};
      Object.keys(detectors).forEach((key) => {
        if (prev[key] !== undefined) {
          next[key] = prev[key];
        }
      });
      return next;
    });
  }, [detectors]);

  const updateDetectors = useCallback(
    (nextDetectors: JsonObject, path?: FieldPathList) => {
      onChange(nextDetectors as unknown, path ?? fieldPathId.path);
    },
    [fieldPathId.path, onChange],
  );

  const getTypeLabel = useCallback(
    (type: string) =>
      t(`${sectionPrefix}.${type}.label`, {
        ns: configNamespace,
        defaultValue: humanizeKey(type),
      }),
    [t, sectionPrefix, configNamespace],
  );

  const getTypeDescription = useCallback(
    (type: string) =>
      t(`${sectionPrefix}.${type}.description`, {
        ns: configNamespace,
        defaultValue: "",
      }),
    [t, sectionPrefix, configNamespace],
  );

  const shouldShowRestartForPath = useCallback(
    (path: Array<string | number>) =>
      requiresRestartForFieldPath(
        path,
        restartRequired,
        defaultRequiresRestart,
      ),
    [defaultRequiresRestart, restartRequired],
  );

  const renderRestartIcon = (isRequired: boolean) => {
    if (!isRequired) {
      return null;
    }

    return <RestartRequiredIndicator className="ml-2" />;
  };

  const isSingleInstanceType = useCallback(
    (type: string) => !multiInstanceSet.has(type),
    [multiInstanceSet],
  );

  const getDetectorDefaults = useCallback(
    (type: string) => {
      const schema = detectorSchemaByType.get(type);
      if (!schema) {
        return { type };
      }

      const base = { type } as Record<string, unknown>;
      const withDefaults = applySchemaDefaults(schema, base);
      return { ...withDefaults, type } as Record<string, unknown>;
    },
    [detectorSchemaByType],
  );

  const resolveDuplicateType = useCallback(
    (targetType: string, excludeKey?: string) => {
      return Object.entries(detectors).some(([key, value]) => {
        if (excludeKey && key === excludeKey) {
          return false;
        }
        return getInstanceType(value) === targetType;
      });
    },
    [detectors],
  );

  const handleAdd = useCallback(() => {
    if (!addType) {
      setAddError(
        t("selectItem", {
          ns: "common",
          defaultValue: "Select {{item}}",
          item: t("detectors.type.label", {
            ns: configNamespace,
            defaultValue: "Type",
          }),
        }),
      );
      return;
    }

    if (isSingleInstanceType(addType) && resolveDuplicateType(addType)) {
      setAddError(
        t("configForm.detectors.singleType", {
          ns: "views/settings",
          defaultValue: "Only one {{type}} detector is allowed.",
          type: getTypeLabel(addType),
        }),
      );
      return;
    }

    const baseKey = addType;
    let nextKey = baseKey;
    let index = 2;
    while (Object.prototype.hasOwnProperty.call(detectors, nextKey)) {
      nextKey = `${baseKey}${index}`;
      index += 1;
    }

    const nextDetectors = {
      ...detectors,
      [nextKey]: getDetectorDefaults(addType),
    } as JsonObject;

    setAddError(undefined);
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.add(nextKey);
      return next;
    });

    updateDetectors(nextDetectors);
  }, [
    addType,
    t,
    configNamespace,
    detectors,
    getDetectorDefaults,
    getTypeLabel,
    isSingleInstanceType,
    resolveDuplicateType,
    updateDetectors,
  ]);

  const handleRemove = useCallback(
    (key: string) => {
      const { [key]: _, ...rest } = detectors;
      updateDetectors(rest as JsonObject);
      setOpenKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    [detectors, updateDetectors],
  );

  const commitRename = useCallback(
    (key: string, nextKey: string) => {
      const trimmed = nextKey.trim();
      if (!trimmed) {
        setRenameErrors((prev) => ({
          ...prev,
          [key]: t("configForm.detectors.keyRequired", {
            ns: "views/settings",
            defaultValue: "Detector name is required.",
          }),
        }));
        return;
      }

      if (trimmed !== key && detectors[trimmed] !== undefined) {
        setRenameErrors((prev) => ({
          ...prev,
          [key]: t("configForm.detectors.keyDuplicate", {
            ns: "views/settings",
            defaultValue: "Detector name already exists.",
          }),
        }));
        return;
      }

      setRenameErrors((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });

      setRenameDrafts((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });

      if (trimmed === key) {
        return;
      }

      const { [key]: value, ...rest } = detectors;
      const nextDetectors = { ...rest, [trimmed]: value } as JsonObject;

      setOpenKeys((prev) => {
        const next = new Set(prev);
        if (next.delete(key)) {
          next.add(trimmed);
        }
        return next;
      });

      updateDetectors(nextDetectors);
    },
    [detectors, t, updateDetectors],
  );

  const handleTypeChange = useCallback(
    (key: string, nextType: string) => {
      const currentType = getInstanceType(detectors[key]);
      if (!nextType || nextType === currentType) {
        return;
      }

      if (
        isSingleInstanceType(nextType) &&
        resolveDuplicateType(nextType, key)
      ) {
        setTypeErrors((prev) => ({
          ...prev,
          [key]: t("configForm.detectors.singleType", {
            ns: "views/settings",
            defaultValue: "Only one {{type}} detector is allowed.",
            type: getTypeLabel(nextType),
          }),
        }));
        return;
      }

      setTypeErrors((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });

      const nextDetectors = {
        ...detectors,
        [key]: getDetectorDefaults(nextType),
      } as JsonObject;

      updateDetectors(nextDetectors);
    },
    [
      detectors,
      getDetectorDefaults,
      getTypeLabel,
      isSingleInstanceType,
      resolveDuplicateType,
      t,
      updateDetectors,
    ],
  );

  const getInstanceUiSchema = useCallback(
    (type: string) => {
      const baseUiSchema =
        (uiSchema?.additionalProperties as UiSchema | undefined) ?? {};
      const globalHidden = buildHiddenUiSchema(globalHiddenFields);
      const hiddenOverrides = buildHiddenUiSchema(hiddenByType[type] ?? []);
      const typeHidden = { type: { "ui:widget": "hidden" } } as UiSchema;
      const nestedOverrides = {
        "ui:options": {
          disableNestedCard: true,
        },
      } as UiSchema;

      const withGlobalHidden = mergeUiSchema(baseUiSchema, globalHidden);
      const withTypeHidden = mergeUiSchema(withGlobalHidden, hiddenOverrides);
      const withTypeHiddenAndOptions = mergeUiSchema(
        withTypeHidden,
        typeHidden,
      );
      return mergeUiSchema(withTypeHiddenAndOptions, nestedOverrides);
    },
    [globalHiddenFields, hiddenByType, uiSchema?.additionalProperties],
  );

  const renderInstanceForm = useCallback(
    (key: string, value: unknown) => {
      const SchemaField = registry.fields.SchemaField;
      const type = getInstanceType(value);
      const schema = type ? detectorSchemaByType.get(type) : undefined;

      if (!SchemaField || !schema || !type) {
        return null;
      }

      const instanceUiSchema = getInstanceUiSchema(type);
      const instanceFieldPathId = toFieldPathId(
        key,
        registry.globalFormOptions,
        fieldPathId.path,
      );

      const instanceErrorSchema = (
        errorSchema as Record<string, ErrorSchema> | undefined
      )?.[key];

      const handleInstanceChange = (
        nextValue: unknown,
        path: FieldPathList,
        errors?: ErrorSchema,
        id?: string,
      ) => {
        onChange(nextValue, path, errors, id);
      };

      return (
        <SchemaField
          name={key}
          schema={schema}
          uiSchema={instanceUiSchema}
          fieldPathId={instanceFieldPathId}
          formData={value}
          errorSchema={instanceErrorSchema}
          onChange={handleInstanceChange}
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
      detectorSchemaByType,
      getInstanceUiSchema,
      disabled,
      errorSchema,
      fieldPathId,
      hideError,
      onChange,
      onBlur,
      onFocus,
      readonly,
      registry,
    ],
  );

  if (!availableTypes.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("configForm.detectors.noSchema", {
          ns: "views/settings",
          defaultValue: "No detector schemas are available.",
        })}
      </p>
    );
  }

  const detectorEntries = Object.entries(detectors);
  const isDisabled = Boolean(disabled || readonly);

  return (
    <div className="space-y-4">
      {detectorEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("configForm.detectors.none", {
            ns: "views/settings",
            defaultValue: "No detector instances configured.",
          })}
        </p>
      ) : (
        <div className="space-y-3">
          {detectorEntries.map(([key, value]) => {
            const type = getInstanceType(value) ?? "";
            const typeLabel = type ? getTypeLabel(type) : key;
            const typeDescription = type ? getTypeDescription(type) : "";
            const isOpen = openKeys.has(key);
            const renameDraft = renameDrafts[key] ?? key;
            const detectorPath = [...fieldPathId.path, key];
            const detectorTypePath = [...detectorPath, "type"];
            const detectorTypeRequiresRestart =
              shouldShowRestartForPath(detectorTypePath);

            return (
              <div key={key} className="rounded-lg border bg-card">
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open) => {
                    setOpenKeys((prev) => {
                      const next = new Set(prev);
                      if (open) {
                        next.add(key);
                      } else {
                        next.delete(key);
                      }
                      return next;
                    });
                  }}
                >
                  <div className="flex items-start justify-between gap-4 p-4">
                    <div className="flex items-start gap-3">
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="mt-0.5"
                        >
                          {isOpen ? (
                            <LuChevronDown className="h-4 w-4" />
                          ) : (
                            <LuChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div>
                        <div className="flex items-center text-sm font-medium">
                          {typeLabel}
                          {renderRestartIcon(detectorTypeRequiresRestart)}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {key}
                          </span>
                        </div>
                        {typeDescription && (
                          <div className="text-xs text-muted-foreground">
                            {typeDescription}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => handleRemove(key)}
                      disabled={isDisabled}
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <div className="space-y-4 border-t p-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                          <Label className="flex items-center">
                            {t("label.ID", {
                              ns: "common",
                              defaultValue: "ID",
                            })}
                          </Label>
                          <Input
                            value={renameDraft}
                            disabled={isDisabled}
                            onChange={(event) => {
                              setRenameDrafts((prev) => ({
                                ...prev,
                                [key]: event.target.value,
                              }));
                            }}
                            onBlur={(event) =>
                              commitRename(key, event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                commitRename(key, renameDraft);
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t("field.internalID", {
                              ns: "common",
                              defaultValue:
                                "The Internal ID Frigate uses in the configuration and database",
                            })}
                          </p>
                          {renameErrors[key] && (
                            <p className="text-xs text-danger">
                              {renameErrors[key]}
                            </p>
                          )}
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label className="flex items-center">
                            {t("detectors.type.label", {
                              ns: configNamespace,
                              defaultValue: "Type",
                            })}
                          </Label>
                          <Select
                            value={type}
                            onValueChange={(value) =>
                              handleTypeChange(key, value)
                            }
                            disabled={isDisabled}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={t("selectItem", {
                                  ns: "common",
                                  defaultValue: "Select {{item}}",
                                  item: t("detectors.type.label", {
                                    ns: configNamespace,
                                    defaultValue: "Type",
                                  }),
                                })}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {orderedTypes.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {getTypeLabel(option)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {typeErrors[key] && (
                            <p className="text-xs text-danger">
                              {typeErrors[key]}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={cn(readonly && "opacity-90")}>
                        {renderInstanceForm(key, value)}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-start pt-5">
        <div className="w-full max-w-lg rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">
            {t("configForm.detectors.add", {
              ns: "views/settings",
              defaultValue: "Add detector",
            })}
          </div>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label>
                {t("detectors.type.label", {
                  ns: configNamespace,
                  defaultValue: "Type",
                })}
              </Label>
              <Select
                value={addType ?? ""}
                onValueChange={(value) => {
                  setAddError(undefined);
                  setAddType(value);
                }}
                disabled={isDisabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("selectItem", {
                      ns: "common",
                      defaultValue: "Select {{item}}",
                      item: t("detectors.type.label", {
                        ns: configNamespace,
                        defaultValue: "Type",
                      }),
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {orderedTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addError && <p className="text-xs text-danger">{addError}</p>}
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAdd}
                disabled={isDisabled}
                className="gap-2"
              >
                <LuPlus className="h-4 w-4" />
                {t("button.add", {
                  ns: "common",
                  defaultValue: "Add",
                })}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
