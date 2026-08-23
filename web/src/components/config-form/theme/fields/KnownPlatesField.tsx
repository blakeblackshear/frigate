import type { FieldPathList, FieldProps, RJSFSchema } from "@rjsf/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuChevronsUpDown,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import type { ConfigFormContext } from "@/types/configForm";
import get from "lodash/get";
import { isSubtreeModified } from "../utils";
import { MapKeyInput } from "../components";

type KnownPlatesData = Record<string, string[]>;

type PlateComboboxProps = {
  id: string;
  value: string;
  entryName: string;
  disabled?: boolean;
  detectedPlates: string[];
  plateAssignments: Map<string, string>;
  autoOpen: boolean;
  onAutoOpened: () => void;
  onCommit: (next: string) => void;
};

/**
 * Plate entry that doubles as a picker for plates Frigate has already
 * recognized. Free text is still accepted so regexes remain typeable.
 */
function PlateCombobox({
  id,
  value,
  entryName,
  disabled,
  detectedPlates,
  plateAssignments,
  autoOpen,
  onAutoOpened,
  onCommit,
}: PlateComboboxProps) {
  const { t } = useTranslation(["views/settings"]);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoOpen) return;
    setOpen(true);
    onAutoOpened();
  }, [autoOpen, onAutoOpened]);

  // Seed the search box with the current plate and select it, so the first
  // keystroke replaces the plate instead of appending to it.
  useEffect(() => {
    if (!open) {
      setSearchValue("");
      return;
    }

    setSearchValue(value);
    const frame = requestAnimationFrame(() => inputRef.current?.select());
    return () => cancelAnimationFrame(frame);
  }, [open, value]);

  const trimmedSearch = searchValue.trim();

  const matchesDetected = useMemo(
    () =>
      detectedPlates.some(
        (plate) => plate.toLowerCase() === trimmedSearch.toLowerCase(),
      ),
    [detectedPlates, trimmedSearch],
  );

  const showCustomOption = trimmedSearch.length > 0 && !matchesDetected;

  const commit = useCallback(
    (next: string) => {
      onCommit(next);
      setOpen(false);
    },
    [onCommit],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "min-w-0 flex-1 justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {value ||
              t("configForm.knownPlates.platePlaceholder", {
                ns: "views/settings",
              })}
          </span>
          <LuChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <Command>
          <CommandInput
            ref={inputRef}
            placeholder={t("configForm.knownPlates.search", {
              ns: "views/settings",
            })}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {showCustomOption && (
              <CommandGroup>
                <CommandItem
                  value={trimmedSearch}
                  onSelect={() => commit(trimmedSearch)}
                >
                  <LuPlus className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {t("configForm.knownPlates.useCustom", {
                      ns: "views/settings",
                      value: trimmedSearch,
                    })}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
            {detectedPlates.length > 0 ? (
              <CommandGroup
                heading={t("configForm.knownPlates.detected", {
                  ns: "views/settings",
                })}
              >
                {detectedPlates.map((plate) => {
                  const assignedTo = plateAssignments.get(plate);
                  const showAssignedTo =
                    !!assignedTo && assignedTo !== entryName;

                  return (
                    <CommandItem
                      key={plate}
                      value={plate}
                      onSelect={() => commit(plate)}
                    >
                      <LuCheck
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === plate ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{plate}</span>
                      {showAssignedTo && (
                        <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground">
                          {t("configForm.knownPlates.assignedTo", {
                            ns: "views/settings",
                            name: assignedTo,
                          })}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : (
              !showCustomOption && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {t("configForm.knownPlates.noneDetected", {
                    ns: "views/settings",
                  })}
                </div>
              )
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function KnownPlatesField(props: FieldProps) {
  const { schema, formData, onChange, idSchema, disabled, readonly } = props;
  const formContext = props.registry?.formContext as
    | ConfigFormContext
    | undefined;

  const configNamespace =
    formContext?.i18nNamespace ??
    (formContext?.level === "camera" ? "config/cameras" : "config/global");
  const { t: fallbackT } = useTranslation(["common", configNamespace]);
  const t = formContext?.t ?? fallbackT;

  const data: KnownPlatesData = useMemo(() => {
    if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
      return {};
    }
    return formData as KnownPlatesData;
  }, [formData]);

  const entries = useMemo(() => Object.entries(data), [data]);

  const id = idSchema?.$id ?? props.name;
  const sectionPrefix = formContext?.sectionI18nPrefix;

  const title =
    t(`${sectionPrefix}.${id}.label`) ?? (schema as RJSFSchema).title;
  const description =
    t(`${sectionPrefix}.${id}.description`) ??
    (schema as RJSFSchema).description;

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

  const { data: recognizedPlates } = useSWR<string[]>(
    open ? ["recognized_license_plates", { split_joined: 1 }] : null,
    { revalidateOnFocus: false },
  );

  const detectedPlates = useMemo(
    () => recognizedPlates ?? [],
    [recognizedPlates],
  );

  const plateAssignments = useMemo(() => {
    const assignments = new Map<string, string>();
    for (const [name, plates] of entries) {
      for (const plate of plates) {
        const trimmed = plate.trim();
        if (trimmed && !assignments.has(trimmed)) {
          assignments.set(trimmed, name);
        }
      }
    }
    return assignments;
  }, [entries]);

  const [pendingOpenPlate, setPendingOpenPlate] = useState<string | null>(null);
  const clearPendingOpenPlate = useCallback(
    () => setPendingOpenPlate(null),
    [],
  );

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
      const plates = [...(data[key] || []), ""];
      onChange({ ...data, [key]: plates }, fieldPath);
      setPendingOpenPlate(`${key}::${plates.length - 1}`);
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
                    <MapKeyInput
                      id={`${entryId}-key`}
                      value={key}
                      placeholder={namePlaceholder}
                      disabled={disabled || readonly}
                      onCommit={(next) => handleRenameKey(key, next)}
                      isKeyTaken={(next) =>
                        next !== key &&
                        Object.prototype.hasOwnProperty.call(data, next)
                      }
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
                        <PlateCombobox
                          id={`${entryId}-plate-${plateIndex}`}
                          value={plate}
                          entryName={key}
                          disabled={disabled || readonly}
                          detectedPlates={detectedPlates}
                          plateAssignments={plateAssignments}
                          autoOpen={
                            pendingOpenPlate === `${key}::${plateIndex}`
                          }
                          onAutoOpened={clearPendingOpenPlate}
                          onCommit={(next) =>
                            handleUpdatePlate(key, plateIndex, next)
                          }
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
