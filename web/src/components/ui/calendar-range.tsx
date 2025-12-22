import { useState, useEffect, useRef } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Switch } from "./switch";
import { cn } from "@/lib/utils";
import { LuCheck } from "react-icons/lu";
import { TZDate } from "react-day-picker";
import { t } from "i18next";

export interface DateRangePickerProps {
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
  onReset?: () => void;
  /** Initial value for start date */
  initialDateFrom?: Date | string;
  /** Initial value for end date */
  initialDateTo?: Date | string;
  /** Initial value for start date for compare */
  initialCompareFrom?: Date | string;
  /** Initial value for end date for compare */
  initialCompareTo?: Date | string;
  /** Alignment of popover */
  align?: "start" | "center" | "end";
  /** Option for locale */
  locale?: string;
  /** Option for showing compare feature */
  showCompare?: boolean;
  /** timezone */
  timezone?: string;
  /** First day of the week: 0 = Sunday, 1 = Monday */
  weekStartsOn?: number;
}

const getDateAdjustedForTimezone = (
  dateInput: Date | string,
  timezone?: string,
): Date => {
  if (typeof dateInput === "string") {
    // Split the date string to get year, month, and day parts
    const parts = dateInput.split("-").map((part) => parseInt(part, 10));
    // Create a new Date object using the local timezone
    // Note: Month is 0-indexed, so subtract 1 from the month part
    const date = new TZDate(parts[0], parts[1] - 1, parts[2], timezone);
    return date;
  } else {
    // If dateInput is already a Date object, return it directly
    return new TZDate(dateInput, timezone);
  }
};

interface DateRange {
  from: Date;
  to: Date | undefined;
}

interface Preset {
  name: string;
  label: string;
}

// Define presets
const PRESETS: Preset[] = [
  { name: "today", label: t("time.today", { ns: "common" }) },
  { name: "yesterday", label: t("time.yesterday", { ns: "common" }) },
  { name: "last7", label: t("time.last7", { ns: "common" }) },
  { name: "last14", label: t("time.last14", { ns: "common" }) },
  { name: "last30", label: t("time.last30", { ns: "common" }) },
  { name: "thisWeek", label: t("time.thisWeek", { ns: "common" }) },
  { name: "lastWeek", label: t("time.lastWeek", { ns: "common" }) },
  { name: "thisMonth", label: t("time.thisMonth", { ns: "common" }) },
  { name: "lastMonth", label: t("time.lastMonth", { ns: "common" }) },
];

/** The DateRangePicker component allows a user to select a range of dates */
export function DateRangePicker({
  timezone,
  initialDateFrom = (() => {
    const date = new TZDate(new Date(), timezone);
    date.setHours(0, 0, 0, 0);
    return date;
  })(),
  initialDateTo,
  initialCompareFrom,
  initialCompareTo,
  onUpdate,
  onReset,
  showCompare = true,
  weekStartsOn = 0,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [range, setRange] = useState<DateRange>({
    from: getDateAdjustedForTimezone(initialDateFrom, timezone),
    to: initialDateTo
      ? getDateAdjustedForTimezone(initialDateTo, timezone)
      : getDateAdjustedForTimezone(initialDateFrom, timezone),
  });
  const [rangeCompare, setRangeCompare] = useState<DateRange | undefined>(
    initialCompareFrom
      ? {
          from: new TZDate(
            new Date(initialCompareFrom).setHours(0, 0, 0, 0),
            timezone,
          ),
          to: initialCompareTo
            ? new TZDate(
                new Date(initialCompareTo).setHours(0, 0, 0, 0),
                timezone,
              )
            : new TZDate(
                new Date(initialCompareFrom).setHours(0, 0, 0, 0),
                timezone,
              ),
        }
      : undefined,
  );

  // Refs to store the values of range and rangeCompare when the date picker is opened
  const openedRangeRef = useRef<DateRange | undefined>();
  const openedRangeCompareRef = useRef<DateRange | undefined>();

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(
    undefined,
  );

  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 960 : false,
  );

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960);
    };

    window.addEventListener("resize", handleResize);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const getPresetRange = (presetName: string): DateRange => {
    const preset = PRESETS.find(({ name }) => name === presetName);
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`);
    const from = new TZDate(new Date(), timezone);
    const to = new TZDate(new Date(), timezone);
    const dayOfWeek = from.getDay();
    const daysFromWeekStart = (dayOfWeek - weekStartsOn + 7) % 7;
    const first = from.getDate() - daysFromWeekStart;

    switch (preset.name) {
      case "today":
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() - 1);
        to.setHours(23, 59, 59, 999);
        break;
      case "last7":
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "last14":
        from.setDate(from.getDate() - 13);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "last30":
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "thisWeek":
        from.setDate(first);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "lastWeek":
        from.setDate(first - 7);
        to.setDate(first - 1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "thisMonth":
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "lastMonth":
        from.setMonth(from.getMonth() - 1);
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setDate(0);
        to.setHours(23, 59, 59, 999);
        break;
    }

    return { from, to };
  };

  const setPreset = (preset: string): void => {
    const range = getPresetRange(preset);
    setRange(range);
    if (rangeCompare) {
      const rangeCompare = {
        from: new TZDate(
          range.from.getFullYear() - 1,
          range.from.getMonth(),
          range.from.getDate(),
          timezone,
        ),
        to: range.to
          ? new TZDate(
              range.to.getFullYear() - 1,
              range.to.getMonth(),
              range.to.getDate(),
              timezone,
            )
          : undefined,
      };
      setRangeCompare(rangeCompare);
    }
  };

  const checkPreset = (): void => {
    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name);

      const normalizedRangeFrom = new TZDate(range.from, timezone);
      normalizedRangeFrom.setHours(0, 0, 0, 0);
      const normalizedPresetFrom = new TZDate(
        presetRange.from.setHours(0, 0, 0, 0),
        timezone,
      );

      const normalizedRangeTo = new TZDate(range.to ?? new Date(0), timezone);
      normalizedRangeTo.setHours(0, 0, 0, 0);
      const normalizedPresetTo = new TZDate(
        presetRange.to?.setHours(0, 0, 0, 0) ?? 0,
        timezone,
      );

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name);
        return;
      }
    }

    setSelectedPreset(undefined);
  };

  const resetValues = (): void => {
    setRange({
      from:
        typeof initialDateFrom === "string"
          ? getDateAdjustedForTimezone(initialDateFrom)
          : initialDateFrom,
      to: initialDateTo
        ? typeof initialDateTo === "string"
          ? getDateAdjustedForTimezone(initialDateTo)
          : initialDateTo
        : typeof initialDateFrom === "string"
          ? getDateAdjustedForTimezone(initialDateFrom)
          : initialDateFrom,
    });
    setRangeCompare(
      initialCompareFrom
        ? {
            from:
              typeof initialCompareFrom === "string"
                ? getDateAdjustedForTimezone(initialCompareFrom)
                : initialCompareFrom,
            to: initialCompareTo
              ? typeof initialCompareTo === "string"
                ? getDateAdjustedForTimezone(initialCompareTo)
                : initialCompareTo
              : typeof initialCompareFrom === "string"
                ? getDateAdjustedForTimezone(initialCompareFrom)
                : initialCompareFrom,
          }
        : undefined,
    );
  };

  useEffect(() => {
    checkPreset();
  }, [range]);

  const PresetButton = ({
    preset,
    label,
    isSelected,
  }: {
    preset: string;
    label: string;
    isSelected: boolean;
  }): JSX.Element => (
    <Button
      className={cn(isSelected && "pointer-events-none text-primary")}
      aria-label={label}
      variant="ghost"
      onClick={() => {
        setPreset(preset);
      }}
    >
      <>
        <span className={cn("pr-2 opacity-0", isSelected && "opacity-70")}>
          <LuCheck width={18} height={18} />
        </span>
        {label}
      </>
    </Button>
  );

  // Helper function to check if two date ranges are equal
  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a || !b) return a === b; // If either is undefined, return true if both are undefined
    return (
      a.from.getTime() === b.from.getTime() &&
      (!a.to || !b.to || a.to.getTime() === b.to.getTime())
    );
  };

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = range;
      openedRangeCompareRef.current = rangeCompare;
    }
  }, [isOpen]);

  return (
    <div className="w-full">
      <div className="flex flex-row items-start justify-center py-2">
        <div className="flex">
          <div className="flex flex-col">
            <div className="flex flex-col items-center justify-end gap-2 px-3 pb-4 lg:flex-row lg:items-start lg:pb-0">
              {showCompare && (
                <div className="flex items-center space-x-2 py-1 pr-4">
                  <Switch
                    defaultChecked={Boolean(rangeCompare)}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) {
                        if (!range.to) {
                          setRange({
                            from: range.from,
                            to: range.from,
                          });
                        }
                        setRangeCompare({
                          from: new Date(
                            range.from.getFullYear(),
                            range.from.getMonth(),
                            range.from.getDate() - 365,
                          ),
                          to: range.to
                            ? new Date(
                                range.to.getFullYear() - 1,
                                range.to.getMonth(),
                                range.to.getDate(),
                              )
                            : new Date(
                                range.from.getFullYear() - 1,
                                range.from.getMonth(),
                                range.from.getDate(),
                              ),
                        });
                      } else {
                        setRangeCompare(undefined);
                      }
                    }}
                    id="compare-mode"
                  />
                  <Label htmlFor="compare-mode">Compare</Label>
                </div>
              )}
            </div>
            {isSmallScreen && (
              <Select
                defaultValue={selectedPreset}
                onValueChange={(value) => {
                  setPreset(value);
                }}
              >
                <SelectTrigger className="mx-auto mb-2 w-[180px]">
                  <SelectValue
                    placeholder={t("dates.selectPreset", {
                      ns: "components/filter",
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div>
              <Calendar
                mode="range"
                onSelect={(value: { from?: Date; to?: Date } | undefined) => {
                  if (value?.from != null) {
                    setRange({ from: value.from, to: value?.to });
                  }
                }}
                selected={range}
                numberOfMonths={isSmallScreen ? 1 : 2}
                defaultMonth={
                  new Date(
                    new Date().setMonth(
                      new Date().getMonth() - (isSmallScreen ? 0 : 1),
                    ),
                  )
                }
                timeZone={timezone}
              />
            </div>
          </div>
        </div>
        {!isSmallScreen && (
          <div className="flex flex-col items-end gap-1 pb-6 pl-6 pr-2">
            <div className="flex w-full flex-col items-end gap-1 pb-6 pl-6 pr-2">
              {PRESETS.map((preset) => (
                <PresetButton
                  key={preset.name}
                  preset={preset.name}
                  label={preset.label}
                  isSelected={selectedPreset === preset.name}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mx-auto flex w-64 items-center justify-evenly gap-2 py-2">
        <Button
          variant="select"
          aria-label={t("button.apply", { ns: "common" })}
          onClick={() => {
            setIsOpen(false);
            if (
              !areRangesEqual(range, openedRangeRef.current) ||
              !areRangesEqual(rangeCompare, openedRangeCompareRef.current)
            ) {
              onUpdate?.({ range, rangeCompare });
            }
          }}
        >
          {t("button.apply", { ns: "common" })}
        </Button>
        <Button
          onClick={() => {
            setIsOpen(false);
            resetValues();
            onReset?.();
          }}
          variant="ghost"
          aria-label={t("button.reset", { ns: "common" })}
        >
          {t("button.reset", { ns: "common" })}
        </Button>
      </div>
    </div>
  );
}
