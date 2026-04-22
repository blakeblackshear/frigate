import type { FieldPathList, FieldProps, RJSFSchema } from "@rjsf/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  LuChevronDown,
  LuChevronRight,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import type { ConfigFormContext } from "@/types/configForm";
import get from "lodash/get";
import { isSubtreeModified } from "../utils";

type KnownPlatesData = Record<string, string[]>;

export function KnownPlatesField(props: FieldProps) {
  const { schema, formData, onChange, idSchema, disabled, readonly } = props;
  const formContext = props.registry?.formContext as
    | ConfigFormContext
    | undefined;

  const { t } = useTranslation(["views/settings", "common"]);

  const data: KnownPlatesData = useMemo(() => {
    if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
      return {};
    }
    return formData as KnownPlatesData;
  }, [formData]);

  const entries = useMemo(() => Object.entries(data), [data]);

  const title = (schema as RJSFSchema).title;
  const description = (schema as RJSFSchema).description;

  const hasItems = entries.length > 0;
  const emptyPath = useMemo(() => [] as FieldPathList, []);
  const fieldPath =
    (props as { fieldPathId?: { path?: FieldPathList } }).fieldPathId?.path ??
    emptyPath;

  const isModified = useMemo(() => {
    const baselineRoot = formContext?.baselineFormData;
    const baselineValue = baselineRoot
      ? get(baselineRoot, fieldPath)
      : undefined;
    return isSubtreeModified(
      data,
      baselineValue,
      formContext?.overrides,
      fieldPath,
      formContext?.formData,
    );
  }, [fieldPath, formContext, data]);

  const [open, setOpen] = useState(hasItems || isModified);

  useEffect(() => {
    if (isModified) {
      setOpen(true);
    }
  }, [isModified]);

  useEffect(() => {
    if (hasItems) {
      setOpen(true);
    }
  }, [hasItems]);

  const handleAddEntry = useCallback(() => {
    const next = { ...data, "": [""] };
    onChange(next, fieldPath);
  }, [data, fieldPath, onChange]);

  const handleRemoveEntry = useCallback(
    (key: string) => {
      const next = { ...data };
      delete next[key];
      onChange(next, fieldPath);
    },
    [data, fieldPath, onChange],
  );

  const handleRenameKey = useCallback(
    (oldKey: string, newKey: string) => {
      if (oldKey === newKey) return;
      // Preserve order by rebuilding the object
      const next: KnownPlatesData = {};
      for (const [k, v] of Object.entries(data)) {
        if (k === oldKey) {
          next[newKey] = v;
        } else {
          next[k] = v;
        }
      }
      onChange(next, fieldPath);
    },
    [data, fieldPath, onChange],
  );

  const handleAddPlate = useCallback(
    (key: string) => {
      const next = { ...data, [key]: [...(data[key] || []), ""] };
      onChange(next, fieldPath);
    },
    [data, fieldPath, onChange],
  );

  const handleRemovePlate = useCallback(
    (key: string, plateIndex: number) => {
      const plates = [...(data[key] || [])];
      plates.splice(plateIndex, 1);
      const next = { ...data, [key]: plates };
      onChange(next, fieldPath);
    },
    [data, fieldPath, onChange],
  );

  const handleUpdatePlate = useCallback(
    (key: string, plateIndex: number, value: string) => {
      const plates = [...(data[key] || [])];
      plates[plateIndex] = value;
      const next = { ...data, [key]: plates };
      onChange(next, fieldPath);
    },
    [data, fieldPath, onChange],
  );

  const baseId = idSchema?.$id || "known_plates";
  const deleteLabel = t("button.delete", {
    ns: "common",
    defaultValue: "Delete",
  });
  const namePlaceholder = t("configForm.knownPlates.namePlaceholder", {
    ns: "views/settings",
  });
  const platePlaceholder = t("configForm.knownPlates.platePlaceholder", {
    ns: "views/settings",
  });
  return (
    <Card className="w-full">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle
                  className={cn("text-sm", isModified && "text-unsaved")}
                >
                  {title}
                </CardTitle>
                {description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              {open ? (
                <LuChevronDown className="h-4 w-4" />
              ) : (
                <LuChevronRight className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3 p-4 pt-0">
            {entries.map(([key, plates], entryIndex) => {
              const entryId = `${baseId}-${entryIndex}`;

              return (
                <div
                  key={entryIndex}
                  className="space-y-2 rounded-md border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      id={`${entryId}-key`}
                      defaultValue={key}
                      placeholder={namePlaceholder}
                      disabled={disabled || readonly}
                      onBlur={(e) => handleRenameKey(key, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEntry(key)}
                      disabled={disabled || readonly}
                      aria-label={deleteLabel}
                      title={deleteLabel}
                      className="shrink-0"
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="ml-1 space-y-2 border-l-2 border-muted-foreground/20 pl-3">
                    {plates.map((plate, plateIndex) => (
                      <div key={plateIndex} className="flex items-center gap-2">
                        <Input
                          id={`${entryId}-plate-${plateIndex}`}
                          value={plate}
                          placeholder={platePlaceholder}
                          disabled={disabled || readonly}
                          onChange={(e) =>
                            handleUpdatePlate(key, plateIndex, e.target.value)
                          }
                          className="flex-1"
                        />
                        {plates.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePlate(key, plateIndex)}
                            disabled={disabled || readonly}
                            aria-label={deleteLabel}
                            title={deleteLabel}
                            className="shrink-0"
                          >
                            <LuTrash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddPlate(key)}
                      disabled={disabled || readonly}
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
              );
            })}

            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEntry}
                disabled={disabled || readonly}
                className="gap-2"
              >
                <LuPlus className="h-4 w-4" />
                {t("button.add", { ns: "common", defaultValue: "Add" })}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default KnownPlatesField;
