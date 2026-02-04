import type { WidgetProps } from "@rjsf/utils";
import useSWR from "swr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type FfmpegPresetResponse = {
  hwaccel_args: string[];
  input_args: string[];
  output_args: {
    record: string[];
    detect: string[];
  };
};

type FfmpegArgsMode = "preset" | "manual";

type PresetField =
  | "hwaccel_args"
  | "input_args"
  | "output_args.record"
  | "output_args.detect";

const getPresetOptions = (
  data: FfmpegPresetResponse | undefined,
  field: PresetField | undefined,
): string[] => {
  if (!data || !field) {
    return [];
  }

  if (field === "hwaccel_args") {
    return data.hwaccel_args;
  }

  if (field === "input_args") {
    return data.input_args;
  }

  if (field.startsWith("output_args.")) {
    const key = field.split(".")[1] as "record" | "detect";
    return data.output_args?.[key] ?? [];
  }

  return [];
};

const resolveMode = (
  value: unknown,
  presets: string[],
  defaultMode: FfmpegArgsMode,
): FfmpegArgsMode => {
  if (Array.isArray(value)) {
    return "manual";
  }

  if (typeof value === "string") {
    if (presets.length === 0) {
      return defaultMode;
    }

    return presets.includes(value) ? "preset" : "manual";
  }

  return defaultMode;
};

const normalizeManualText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.join(" ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
};

export function FfmpegArgsWidget(props: WidgetProps) {
  const { t } = useTranslation(["views/settings"]);
  const {
    value,
    onChange,
    disabled,
    readonly,
    options,
    placeholder,
    schema,
    id,
  } = props;
  const presetField = options?.ffmpegPresetField as PresetField | undefined;

  const { data } = useSWR<FfmpegPresetResponse>("ffmpeg/presets");

  const presetOptions = useMemo(
    () => getPresetOptions(data, presetField),
    [data, presetField],
  );

  const canUsePresets = presetOptions.length > 0;
  const defaultMode: FfmpegArgsMode = canUsePresets ? "preset" : "manual";

  const detectedMode = useMemo(
    () => resolveMode(value, presetOptions, defaultMode),
    [value, presetOptions, defaultMode],
  );

  const [mode, setMode] = useState<FfmpegArgsMode>(detectedMode);

  useEffect(() => {
    if (!canUsePresets) {
      setMode("manual");
      return;
    }

    setMode(detectedMode);
  }, [canUsePresets, detectedMode]);

  const handleModeChange = useCallback(
    (nextMode: FfmpegArgsMode) => {
      setMode(nextMode);

      if (nextMode === "preset") {
        const currentValue = typeof value === "string" ? value : undefined;
        const presetValue =
          currentValue && presetOptions.includes(currentValue)
            ? currentValue
            : presetOptions[0];
        if (presetValue) {
          onChange(presetValue);
        }
        return;
      }

      const manualText = normalizeManualText(value);
      onChange(manualText);
    },
    [onChange, presetOptions, value],
  );

  const handlePresetChange = useCallback(
    (preset: string) => {
      onChange(preset);
    },
    [onChange],
  );

  const handleManualChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newText = event.target.value;
      onChange(newText);
    },
    [onChange],
  );

  const manualValue = normalizeManualText(value);
  const presetValue =
    typeof value === "string" && presetOptions.includes(value) ? value : "";

  return (
    <div className="space-y-2">
      <RadioGroup
        value={mode}
        onValueChange={(next) => handleModeChange(next as FfmpegArgsMode)}
        className="gap-3"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="preset"
            id={`${id}-preset`}
            disabled={disabled || readonly || !canUsePresets}
            className={
              mode === "preset"
                ? "bg-selected from-selected/50 to-selected/90 text-selected"
                : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
            }
          />
          <label htmlFor={`${id}-preset`} className="cursor-pointer text-sm">
            {t("configForm.ffmpegArgs.preset", { ns: "views/settings" })}
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="manual"
            id={`${id}-manual`}
            disabled={disabled || readonly}
            className={
              mode === "manual"
                ? "bg-selected from-selected/50 to-selected/90 text-selected"
                : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
            }
          />
          <label htmlFor={`${id}-manual`} className="cursor-pointer text-sm">
            {t("configForm.ffmpegArgs.manual", { ns: "views/settings" })}
          </label>
        </div>
      </RadioGroup>

      {mode === "preset" && canUsePresets ? (
        <Select
          value={presetValue}
          onValueChange={handlePresetChange}
          disabled={disabled || readonly}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue
              placeholder={
                placeholder ||
                schema.title ||
                t("configForm.ffmpegArgs.selectPreset", {
                  ns: "views/settings",
                })
              }
            />
          </SelectTrigger>
          <SelectContent>
            {presetOptions.map((preset) => (
              <SelectItem key={preset} value={preset}>
                {preset}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          value={manualValue}
          onChange={handleManualChange}
          disabled={disabled || readonly}
          placeholder={
            placeholder ||
            t("configForm.ffmpegArgs.manualPlaceholder", {
              ns: "views/settings",
            })
          }
        />
      )}
    </div>
  );
}
