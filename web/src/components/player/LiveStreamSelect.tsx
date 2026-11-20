import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LiveAutoReason } from "@/types/live";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LuInfo } from "react-icons/lu";
import { MdOutlineRestartAlt } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Radix Select needs a non-empty value. Auto itself is stored as the
// absence of a pinned stream
const AUTO_VALUE = "__frigate_auto__";

const GRID_ITEM =
  "h-auto min-h-10 min-w-[calc((100%-1rem)/3)] grow whitespace-normal bg-secondary [overflow-wrap:anywhere] px-2 py-2 text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground data-[state=on]:bg-selected data-[state=on]:text-selected-foreground data-[state=on]:hover:bg-selected data-[state=on]:hover:text-selected-foreground";

type LiveStreamSelectProps = {
  // friendly name to go2rtc stream name, in ladder order
  streams: Record<string, string>;
  pinnedStream: string | undefined;
  playingStream: string;
  autoAvailable: boolean;
  autoReason?: LiveAutoReason;
  // undefined selects auto
  onSelect: (stream: string | undefined) => void;
  // sends auto back to the top of the ladder
  onRetry: () => void;
  disabled: boolean;
  variant?: "select" | "grid";
};

export default function LiveStreamSelect({
  streams,
  pinnedStream,
  playingStream,
  autoAvailable,
  autoReason,
  onSelect,
  onRetry,
  disabled,
  variant = "select",
}: LiveStreamSelectProps) {
  const { t } = useTranslation(["views/live"]);

  const labelFor = useCallback(
    (name: string) =>
      Object.keys(streams).find((label) => streams[label] === name) ?? name,
    [streams],
  );

  const auto = autoAvailable && pinnedStream == undefined;
  const value = auto ? AUTO_VALUE : (pinnedStream ?? playingStream);

  const autoLabel = auto
    ? t("stream.auto.selected", {
        stream:
          autoReason === "floor"
            ? t("stream.auto.floorLabel")
            : labelFor(playingStream),
      })
    : t("stream.auto.label");

  return (
    <>
      {variant === "grid" &&
      !autoAvailable &&
      Object.keys(streams).length <= 1 ? (
        <div className="text-sm">{labelFor(playingStream)}</div>
      ) : variant === "grid" ? (
        <ToggleGroup
          type="single"
          className="flex flex-wrap items-stretch gap-2"
          value={value}
          disabled={disabled}
          onValueChange={(next) => {
            // radix sends an empty value when the active item is tapped again
            if (next) {
              onSelect(next === AUTO_VALUE ? undefined : next);
            }
          }}
        >
          {autoAvailable && (
            <ToggleGroupItem value={AUTO_VALUE} className={GRID_ITEM}>
              {autoLabel}
            </ToggleGroupItem>
          )}
          {Object.entries(streams).map(([label, name]) => (
            <ToggleGroupItem key={label} value={name} className={GRID_ITEM}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : (
        <Select
          value={value}
          disabled={disabled}
          onValueChange={(next) =>
            onSelect(next === AUTO_VALUE ? undefined : next)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>{auto ? autoLabel : labelFor(value)}</SelectValue>
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              {autoAvailable && (
                <SelectItem className="cursor-pointer" value={AUTO_VALUE}>
                  <span className="flex flex-col gap-0.5 whitespace-normal">
                    <span>{t("stream.auto.label")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("stream.auto.tips")}
                    </span>
                  </span>
                </SelectItem>
              )}
              {Object.entries(streams).map(([label, name]) => (
                <SelectItem key={label} className="cursor-pointer" value={name}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}

      {auto && autoReason && !disabled && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
            <LuInfo className="size-4 shrink-0" />
            <div>
              {t(`stream.auto.reason.${autoReason}`, {
                stream: labelFor(playingStream),
              })}
            </div>
          </div>

          {/* data saver pins the lowest stream, so there is no higher one to try */}
          {autoReason !== "saveData" && (
            <Button
              className="flex items-center gap-2.5 rounded-lg"
              aria-label={t("stream.auto.retry")}
              variant="outline"
              size="sm"
              onClick={onRetry}
            >
              <MdOutlineRestartAlt className="size-5 text-primary-variant" />
              <div className="text-primary-variant">
                {t("stream.auto.retry")}
              </div>
            </Button>
          )}
        </div>
      )}
    </>
  );
}
