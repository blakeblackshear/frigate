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
import {
  hardwareForDevices,
  MAX_DETECTORS,
  recommendedDetectorCount,
} from "@/utils/detectionHardware";

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

  // the units a model is assigned to, in the order the probe reports them. A
  // shareable unit repeats in `devices` once per inference process, so the
  // distinct entries are what is selected.
  const selectedUnits = useMemo(() => {
    if (!selected) {
      return [];
    }

    return selected.units
      .map((unit) => unit.device)
      .filter((device) => devices.includes(device));
  }, [selected, devices]);

  /** Spread `count` detectors round robin over the selected units. */
  const buildDevices = useCallback((units: string[], count: number) => {
    if (units.length === 0) {
      return [];
    }

    return Array.from(
      { length: Math.max(count, units.length) },
      (_, index) => units[index % units.length],
    );
  }, []);

  const handleHardwareChange = useCallback(
    (key: string) => {
      const entry = hardware?.find((candidate) => candidate.key === key);

      if (!entry) {
        return;
      }

      // start with the first unit no other model has taken
      const free = entry.units.find((unit) => !claimedElsewhere[unit.device]);

      if (!free) {
        onChange([]);
        return;
      }

      onChange(
        entry.unlimited
          ? buildDevices([free.device], recommended)
          : [free.device],
      );
    },
    [hardware, claimedElsewhere, recommended, buildDevices, onChange],
  );

  const handleUnitToggle = useCallback(
    (device: string, checked: boolean) => {
      if (!selected) {
        return;
      }

      const units = selected.units
        .map((unit) => unit.device)
        .filter((candidate) =>
          candidate === device ? checked : selectedUnits.includes(candidate),
        );

      if (!selected.unlimited) {
        onChange(units);
        return;
      }

      // keep the detector count while the set of units changes
      onChange(buildDevices(units, devices.length));
    },
    [selected, selectedUnits, devices.length, buildDevices, onChange],
  );

  const handleCountChange = useCallback(
    (value: string) => {
      onChange(buildDevices(selectedUnits, Number(value)));
    },
    [selectedUnits, buildDevices, onChange],
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
        <p className="text-xs text-muted-foreground">
          {t("detectionModels.hardware.description")}
        </p>
      </div>

      {unrecognized ? (
        <p className="text-sm text-danger">
          {t("detectionModels.hardware.unrecognized", {
            devices: devices.join(", "),
          })}
        </p>
      ) : null}

      {selected && (selected.units.length > 1 || !selected.unlimited) ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("detectionModels.hardware.unitsDescription")}
          </p>
          {selected.units.map((unit) => {
            const claimedBy = claimedElsewhere[unit.device];

            return (
              <div
                key={unit.device}
                className="mb-3 flex flex-row items-center space-x-3 space-y-0 last:mb-0"
              >
                <Checkbox
                  id={`${idPrefix}-${unit.device}`}
                  className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
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
          <Label htmlFor={`${idPrefix}-detector-count`}>
            {t("detectionModels.hardware.detectorCount")}
          </Label>
          <Select
            value={String(devices.length || 1)}
            onValueChange={handleCountChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={`${idPrefix}-detector-count`}
              className="max-w-md"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: MAX_DETECTORS }, (_, index) => index + 1)
                .filter((count) => count >= Math.max(selectedUnits.length, 1))
                .map((count) => (
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
          <p className="text-xs text-muted-foreground">
            {t("detectionModels.hardware.detectorCountDescription")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default HardwarePicker;
