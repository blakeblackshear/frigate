import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetectionHardware } from "@/types/hardware";

// one detector per this many cameras, so the recommendation grows with the
// install without spawning a process per camera
const CAMERAS_PER_DETECTOR = 8;
const MAX_DETECTORS = 8;

/** How many detectors to suggest for a model serving this many cameras. */
function recommendedDetectorCount(cameraCount: number): number {
  const scaled = Math.ceil(cameraCount / CAMERAS_PER_DETECTOR);
  return Math.min(Math.max(scaled, 1), MAX_DETECTORS);
}

/** The hardware whose units cover every one of these device strings. */
function hardwareForDevices(
  hardware: DetectionHardware[],
  devices: string[],
): DetectionHardware | undefined {
  if (devices.length === 0) {
    return undefined;
  }

  return hardware.find((entry) => {
    const known = new Set(entry.units.map((unit) => unit.device));
    return devices.every((device) => known.has(device));
  });
}

type HardwarePickerProps = {
  // scopes the unit checkbox ids, since several models can list the same unit
  idPrefix: string;
  devices: string[];
  // device strings already taken by another model, mapped to that model's scene
  claimedElsewhere: Record<string, string>;
  cameraCount: number;
  disabled?: boolean;
  onChange: (devices: string[]) => void;
};

export function HardwarePicker({
  idPrefix,
  devices,
  claimedElsewhere,
  cameraCount,
  disabled,
  onChange,
}: HardwarePickerProps) {
  const { t } = useTranslation(["views/settings", "common"]);

  const { data: hardware, isLoading } =
    useSWR<DetectionHardware[]>("hardware/probe");

  const selected = useMemo(
    () => hardwareForDevices(hardware ?? [], devices),
    [hardware, devices],
  );

  const recommended = useMemo(
    () => recommendedDetectorCount(cameraCount),
    [cameraCount],
  );

  const handleHardwareChange = useCallback(
    (key: string) => {
      const entry = hardware?.find((candidate) => candidate.key === key);

      if (!entry) {
        return;
      }

      if (entry.unlimited) {
        onChange(Array(recommended).fill(entry.units[0].device));
        return;
      }

      // start with the first unit no other model has taken
      const free = entry.units.find((unit) => !claimedElsewhere[unit.device]);
      onChange(free ? [free.device] : []);
    },
    [hardware, claimedElsewhere, recommended, onChange],
  );

  const handleUnitToggle = useCallback(
    (device: string, checked: boolean) => {
      if (checked) {
        onChange([...devices, device]);
        return;
      }

      onChange(devices.filter((current) => current !== device));
    },
    [devices, onChange],
  );

  const handleCountChange = useCallback(
    (value: string) => {
      if (!selected) {
        return;
      }

      onChange(Array(Number(value)).fill(selected.units[0].device));
    },
    [selected, onChange],
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("detectionModels.hardware.loading")}
      </p>
    );
  }

  // a hand-written config can name hardware this system does not report
  const unrecognized = devices.length > 0 && !selected;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{t("detectionModels.hardware.label")}</Label>
        <Select
          value={selected?.key ?? ""}
          onValueChange={handleHardwareChange}
          disabled={disabled}
        >
          <SelectTrigger className="max-w-md">
            <SelectValue
              placeholder={t("detectionModels.hardware.placeholder")}
            />
          </SelectTrigger>
          <SelectContent>
            {(hardware ?? []).map((entry) => (
              <SelectItem key={entry.key} value={entry.key}>
                {entry.name}
                {entry.count > 1 ? ` (${entry.count})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {unrecognized ? (
        <p className="text-sm text-danger">
          {t("detectionModels.hardware.unrecognized", {
            devices: devices.join(", "),
          })}
        </p>
      ) : null}

      {selected && !selected.unlimited ? (
        <div className="space-y-2">
          {selected.units.map((unit) => {
            const claimedBy = claimedElsewhere[unit.device];

            return (
              <div key={unit.device} className="flex items-center gap-2">
                <Checkbox
                  id={`${idPrefix}-${unit.device}`}
                  checked={devices.includes(unit.device)}
                  disabled={disabled || Boolean(claimedBy)}
                  onCheckedChange={(checked) =>
                    handleUnitToggle(unit.device, checked === true)
                  }
                />
                <Label
                  htmlFor={`${idPrefix}-${unit.device}`}
                  className="cursor-pointer font-normal"
                >
                  {unit.label}
                  {claimedBy ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t("detectionModels.hardware.claimedBy", {
                        scene: claimedBy,
                      })}
                    </span>
                  ) : null}
                </Label>
              </div>
            );
          })}
        </div>
      ) : null}

      {selected?.unlimited ? (
        <div className="space-y-1">
          <Label>{t("detectionModels.hardware.detectorCount")}</Label>
          <Select
            value={String(devices.length || 1)}
            onValueChange={handleCountChange}
            disabled={disabled}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(
                { length: MAX_DETECTORS },
                (_, index) => index + 1,
              ).map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count === recommended
                    ? t("detectionModels.hardware.countRecommended", {
                        count,
                        cameras: cameraCount,
                      })
                    : String(count)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

export default HardwarePicker;
