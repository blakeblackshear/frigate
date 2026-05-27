import type { FieldPathList, FieldProps, RJSFSchema } from "@rjsf/utils";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import type { ConfigFormContext } from "@/types/configForm";
import get from "lodash/get";
import { isSubtreeModified } from "../utils";

type LiveStreamsData = Record<string, string>;

type StreamValueComboboxProps = {
  id: string;
  value: string;
  options: string[];
  disabled?: boolean;
  readonly?: boolean;
  onChange: (next: string) => void;
};

function StreamValueCombobox({
  id,
  value,
  options,
  disabled,
  readonly,
  onChange,
}: StreamValueComboboxProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const trimmedSearch = searchValue.trim();
  const matchesOption = useMemo(
    () => options.some((o) => o.toLowerCase() === trimmedSearch.toLowerCase()),
    [options, trimmedSearch],
  );
  const showCustomOption = trimmedSearch.length > 0 && !matchesOption;

  const commit = (next: string) => {
    onChange(next);
    setSearchValue("");
    setOpen(false);
  };

  const placeholder = t("configForm.liveStreams.go2rtcStreamPlaceholder", {
    ns: "views/settings",
  });
  const searchPlaceholder = t("configForm.liveStreams.go2rtcStreamSearch", {
    ns: "views/settings",
  });
  const noStreams = t("configForm.liveStreams.noGo2rtcStreams", {
    ns: "views/settings",
  });
  const availableHeading = t("configForm.liveStreams.availableStreams", {
    ns: "views/settings",
  });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearchValue("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || readonly}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCustomOption) {
                e.preventDefault();
                commit(trimmedSearch);
              }
            }}
          />
          <CommandList>
            {showCustomOption && (
              <CommandGroup>
                <CommandItem
                  value={trimmedSearch}
                  onSelect={() => commit(trimmedSearch)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("configForm.liveStreams.useCustom", {
                    ns: "views/settings",
                    value: trimmedSearch,
                  })}
                </CommandItem>
              </CommandGroup>
            )}
            {options.length > 0 ? (
              <CommandGroup heading={availableHeading}>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => commit(option)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : !showCustomOption ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {noStreams}
              </div>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function LiveStreamsField(props: FieldProps) {
  const { schema, formData, onChange, idSchema, disabled, readonly } = props;
  const formContext = props.registry?.formContext as
    | ConfigFormContext
    | undefined;

  const configNamespace =
    formContext?.i18nNamespace ??
    (formContext?.level === "camera" ? "config/cameras" : "config/global");
  const { t: fallbackT } = useTranslation(["common", configNamespace]);
  const t = formContext?.t ?? fallbackT;

  const data: LiveStreamsData = useMemo(() => {
    if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
      return {};
    }
    return formData as LiveStreamsData;
  }, [formData]);

  const entries = useMemo(() => Object.entries(data), [data]);

  const id = idSchema?.$id ?? props.name;
  const sectionPrefix = formContext?.sectionI18nPrefix;

  const title =
    t(`${sectionPrefix}.${id}.label`) ?? (schema as RJSFSchema).title;
  const description =
    t(`${sectionPrefix}.${id}.description`) ??
    (schema as RJSFSchema).description;

  const go2rtcStreamNames = useMemo<string[]>(() => {
    const streams = formContext?.fullConfig?.go2rtc?.streams;
    if (!streams || typeof streams !== "object") return [];
    return Object.keys(streams).sort();
  }, [formContext?.fullConfig?.go2rtc?.streams]);

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

  const handleAddEntry = useCallback(() => {
    const next = { ...data, "": "" };
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
      const next: LiveStreamsData = {};
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

  const handleUpdateValue = useCallback(
    (key: string, value: string) => {
      const next = { ...data, [key]: value };
      onChange(next, fieldPath);
    },
    [data, fieldPath, onChange],
  );

  const baseId = idSchema?.$id || "live_streams";
  const deleteLabel = t("button.delete", {
    ns: "common",
    defaultValue: "Delete",
  });
  const streamNameLabel = t("configForm.liveStreams.streamNameLabel", {
    ns: "views/settings",
  });
  const streamNamePlaceholder = t(
    "configForm.liveStreams.streamNamePlaceholder",
    { ns: "views/settings" },
  );
  const go2rtcStreamLabel = t("configForm.liveStreams.go2rtcStreamLabel", {
    ns: "views/settings",
  });
  const addStreamLabel = t("configForm.liveStreams.addStream", {
    ns: "views/settings",
  });

  return (
    <Card className="w-full">
      <CardHeader className="p-4">
        <CardTitle className={cn("text-sm", isModified && "text-unsaved")}>
          {title}
        </CardTitle>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {entries.map(([key, value], entryIndex) => {
          const entryId = `${baseId}-${entryIndex}`;
          return (
            <div
              key={entryIndex}
              className="grid grid-cols-12 items-end gap-2 rounded-md border p-3"
            >
              <div className="col-span-12 space-y-2 md:col-span-5">
                <Label htmlFor={`${entryId}-key`}>{streamNameLabel}</Label>
                <Input
                  id={`${entryId}-key`}
                  defaultValue={key}
                  placeholder={streamNamePlaceholder}
                  disabled={disabled || readonly}
                  onBlur={(e) => handleRenameKey(key, e.target.value)}
                />
              </div>
              <div className="col-span-10 space-y-2 md:col-span-6">
                <Label htmlFor={`${entryId}-value`}>{go2rtcStreamLabel}</Label>
                <StreamValueCombobox
                  id={`${entryId}-value`}
                  value={value}
                  options={go2rtcStreamNames}
                  disabled={disabled}
                  readonly={readonly}
                  onChange={(next) => handleUpdateValue(key, next)}
                />
              </div>
              <div className="col-span-2 flex justify-end md:col-span-1">
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
            {addStreamLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default LiveStreamsField;
