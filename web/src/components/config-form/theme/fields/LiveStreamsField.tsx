import type { FieldPathList, FieldProps, RJSFSchema } from "@rjsf/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Reorder, useDragControls } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  LuArrowDownWideNarrow,
  LuGripVertical,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import { MapKeyInput } from "../components";
import type { ConfigFormContext } from "@/types/configForm";
import type { LiveTranscodeConfig } from "@/types/frigateConfig";
import get from "lodash/get";
import isEqual from "lodash/isEqual";
import { isSubtreeModified } from "../utils";
import {
  isTranscodeStreamName,
  transcodeBitrateFor,
} from "@/utils/liveTranscode";

type LiveStreamsData = Record<string, string>;

// kbps measured by the server, or configured for a transcoded stream
type StreamRate = { kbps: number; set: boolean } | { failed: true };

function rateValue(rate: StreamRate | undefined): number {
  return rate && "kbps" in rate ? rate.kbps : -1;
}

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

type StreamRowProps = {
  entryKey: string;
  value: string;
  entryId: string;
  data: LiveStreamsData;
  generated: boolean;
  rate?: StreamRate;
  options: string[];
  disabled?: boolean;
  readonly?: boolean;
  onRename: (oldKey: string, newKey: string) => void;
  onUpdateValue: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  onDragEnd: () => void;
};

function StreamRow({
  entryKey,
  value,
  entryId,
  data,
  generated,
  rate,
  options,
  disabled,
  readonly,
  onRename,
  onUpdateValue,
  onRemove,
  onDragEnd,
}: StreamRowProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const controls = useDragControls();
  const locked = disabled || readonly;

  const deleteLabel = t("button.delete", {
    ns: "common",
    defaultValue: "Delete",
  });

  let rateLabel: string | undefined;
  if (rate && "failed" in rate) {
    rateLabel = t("configForm.liveStreams.rateFailed", {
      ns: "views/settings",
    });
  } else if (rate?.set) {
    rateLabel = t("configForm.liveStreams.rateSet", {
      ns: "views/settings",
      kbps: rate.kbps,
    });
  } else if (rate) {
    rateLabel = t("configForm.liveStreams.rate", {
      ns: "views/settings",
      kbps: rate.kbps,
    });
  }

  return (
    <Reorder.Item
      as="div"
      value={entryKey}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="grid grid-cols-12 items-end gap-2 rounded-md border bg-background p-3"
    >
      <div className="col-span-12 flex items-end gap-1 md:col-span-5">
        <button
          type="button"
          disabled={locked}
          onPointerDown={(e) => controls.start(e)}
          className="mb-2 cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-primary active:cursor-grabbing disabled:cursor-not-allowed"
          aria-label={t("configForm.liveStreams.reorderHandle", {
            ns: "views/settings",
          })}
        >
          <LuGripVertical className="size-4" />
        </button>
        <div className="flex-1 space-y-2">
          <Label htmlFor={`${entryId}-key`}>
            {t("configForm.liveStreams.streamNameLabel", {
              ns: "views/settings",
            })}
          </Label>
          <MapKeyInput
            id={`${entryId}-key`}
            value={entryKey}
            placeholder={t("configForm.liveStreams.streamNamePlaceholder", {
              ns: "views/settings",
            })}
            disabled={locked}
            onCommit={(next) => onRename(entryKey, next)}
            isKeyTaken={(next) =>
              next !== entryKey &&
              Object.prototype.hasOwnProperty.call(data, next)
            }
          />
        </div>
      </div>
      <div className="col-span-10 space-y-2 md:col-span-6">
        <Label htmlFor={`${entryId}-value`} className="flex items-center gap-2">
          {t("configForm.liveStreams.go2rtcStreamLabel", {
            ns: "views/settings",
          })}
          {generated && (
            <Badge variant="secondary">
              {t("configForm.liveStreams.transcodedBadge", {
                ns: "views/settings",
              })}
            </Badge>
          )}
        </Label>
        {generated ? (
          <Input id={`${entryId}-value`} value={value} disabled readOnly />
        ) : (
          <StreamValueCombobox
            id={`${entryId}-value`}
            value={value}
            options={options}
            disabled={disabled}
            readonly={readonly}
            onChange={(next) => onUpdateValue(entryKey, next)}
          />
        )}
        {rateLabel && (
          <p className="text-xs text-muted-foreground">{rateLabel}</p>
        )}
      </div>
      <div className="col-span-2 flex justify-end md:col-span-1">
        {!generated && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(entryKey)}
            disabled={locked}
            aria-label={deleteLabel}
            title={deleteLabel}
            className="shrink-0"
          >
            <LuTrash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Reorder.Item>
  );
}

export function LiveStreamsField(props: FieldProps) {
  const { schema, formData, onChange, idSchema, disabled, readonly } = props;
  const formContext = props.registry?.formContext as
    ConfigFormContext | undefined;

  const configNamespace =
    formContext?.i18nNamespace ??
    (formContext?.level === "camera" ? "config/cameras" : "config/global");
  const { t: fallbackT } = useTranslation(["common", configNamespace]);
  const t = formContext?.t ?? fallbackT;
  const { t: tSettings } = useTranslation(["views/settings"]);

  const data: LiveStreamsData = useMemo(() => {
    if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
      return {};
    }
    return formData as LiveStreamsData;
  }, [formData]);

  const entries = useMemo(() => Object.entries(data), [data]);
  const keys = useMemo(() => entries.map(([key]) => key), [entries]);

  const id = idSchema?.$id ?? props.name;
  const sectionPrefix = formContext?.sectionI18nPrefix;

  const title =
    t(`${sectionPrefix}.${id}.label`) ?? (schema as RJSFSchema).title;
  const description =
    t(`${sectionPrefix}.${id}.description`) ??
    (schema as RJSFSchema).description;

  const camera = formContext?.cameraName ?? "";
  const transcode = formContext?.formData?.transcode as
    LiveTranscodeConfig | undefined;

  const go2rtcStreamNames = useMemo<string[]>(() => {
    const streams = formContext?.fullConfig?.go2rtc?.streams;
    if (!streams || typeof streams !== "object") return [];
    return Object.keys(streams).sort();
  }, [formContext?.fullConfig?.go2rtc?.streams]);

  const isGenerated = useCallback(
    (name: string) =>
      isTranscodeStreamName(camera, name) && !go2rtcStreamNames.includes(name),
    [camera, go2rtcStreamNames],
  );

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

  const commitOrder = useCallback(
    (order: string[]) => {
      const next: LiveStreamsData = {};
      order.forEach((key) => {
        next[key] = data[key];
      });
      onChange(next, fieldPath);
    },
    [data, fieldPath, onChange],
  );

  // rows keep one React key through renames, so the name input stays mounted
  const rowIdsRef = useRef(new Map<string, number>());
  const nextRowIdRef = useRef(0);

  const rowIdFor = (key: string) => {
    let id = rowIdsRef.current.get(key);

    if (id === undefined) {
      id = nextRowIdRef.current++;
      rowIdsRef.current.set(key, id);
    }

    return id;
  };

  // local order while dragging; committed to the form on drop
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const dragOrderRef = useRef<string[] | null>(null);

  const handleReorder = useCallback((next: string[]) => {
    dragOrderRef.current = next;
    setDragOrder(next);
  }, []);

  const handleDragEnd = useCallback(() => {
    const next = dragOrderRef.current;
    dragOrderRef.current = null;
    setDragOrder(null);

    if (next && !isEqual(next, keys)) {
      commitOrder(next);
    }
  }, [commitOrder, keys]);

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

      const id = rowIdsRef.current.get(oldKey);
      if (id !== undefined) {
        rowIdsRef.current.delete(oldKey);
        rowIdsRef.current.set(newKey, id);
      }

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

  // Auto order commits after measuring, so edits made meanwhile must survive
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const [measurement, setMeasurement] = useState<{
    data: LiveStreamsData;
    transcode: LiveTranscodeConfig | undefined;
    rates: Record<string, StreamRate>;
  } | null>(null);
  const [measuring, setMeasuring] = useState(false);

  // rates describe the streams as measured; a later edit hides them, while a
  // reorder alone keeps them since isEqual ignores key order
  const rates =
    measurement &&
    isEqual(measurement.data, data) &&
    isEqual(measurement.transcode, transcode)
      ? measurement.rates
      : {};

  const handleAutoOrder = useCallback(async () => {
    setMeasuring(true);

    const measured = await Promise.all(
      entries.map(async ([, name]): Promise<[string, StreamRate]> => {
        const setRate = transcodeBitrateFor(camera, name, transcode);

        if (setRate !== undefined) {
          return [name, { kbps: setRate, set: true }];
        }

        try {
          const response = await axios.get(
            `go2rtc/streams/${encodeURIComponent(name)}/bitrate`,
          );
          return [name, { kbps: response.data.kbps, set: false }];
        } catch {
          return [name, { failed: true }];
        }
      }),
    );

    const next = Object.fromEntries(measured);
    const latest = dataRef.current;
    setMeasurement({ data: latest, transcode, rates: next });
    setMeasuring(false);

    // stable sort, so ties and unmeasured rows keep their order; rows added
    // or renamed while measuring go last
    const sorted = [...entries]
      .sort(([, a], [, b]) => rateValue(next[b]) - rateValue(next[a]))
      .map(([key]) => key)
      .filter((key) => key in latest);
    const order = [
      ...sorted,
      ...Object.keys(latest).filter((key) => !sorted.includes(key)),
    ];

    if (!isEqual(order, Object.keys(latest))) {
      onChange(
        Object.fromEntries(order.map((key) => [key, latest[key]])),
        fieldPath,
      );
    }
  }, [camera, entries, fieldPath, onChange, transcode]);

  const baseId = idSchema?.$id || "live_streams";
  const order = dragOrder ?? keys;

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
        <Reorder.Group
          as="div"
          axis="y"
          values={order}
          onReorder={handleReorder}
          className="space-y-3"
        >
          {order.map((key, entryIndex) => (
            <StreamRow
              key={rowIdFor(key)}
              entryKey={key}
              value={data[key] ?? ""}
              entryId={`${baseId}-${entryIndex}`}
              data={data}
              generated={isGenerated(data[key] ?? "")}
              rate={rates[data[key] ?? ""]}
              options={go2rtcStreamNames}
              disabled={disabled}
              readonly={readonly}
              onRename={handleRenameKey}
              onUpdateValue={handleUpdateValue}
              onRemove={handleRemoveEntry}
              onDragEnd={handleDragEnd}
            />
          ))}
        </Reorder.Group>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddEntry}
            disabled={disabled || readonly}
            className="gap-2"
          >
            <LuPlus className="h-4 w-4" />
            {tSettings("configForm.liveStreams.addStream")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoOrder}
            disabled={disabled || readonly || measuring || entries.length < 2}
            title={tSettings("configForm.liveStreams.autoOrderTips")}
            className="gap-2"
          >
            {measuring ? (
              <ActivityIndicator className="size-4" />
            ) : (
              <LuArrowDownWideNarrow className="h-4 w-4" />
            )}
            {measuring
              ? tSettings("configForm.liveStreams.measuring")
              : tSettings("configForm.liveStreams.autoOrder")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default LiveStreamsField;
