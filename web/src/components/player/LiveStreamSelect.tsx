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

// Radix Select needs a non-empty value. Auto itself is stored as the
// absence of a pinned stream
const AUTO_VALUE = "__frigate_auto__";

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
}: LiveStreamSelectProps) {
  const { t } = useTranslation(["views/live"]);

  const labelFor = useCallback(
    (name: string) =>
      Object.keys(streams).find((label) => streams[label] === name) ?? name,
    [streams],
  );

  const auto = autoAvailable && pinnedStream == undefined;
  const value = auto ? AUTO_VALUE : (pinnedStream ?? playingStream);

  return (
    <>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) =>
          onSelect(next === AUTO_VALUE ? undefined : next)
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {auto
              ? t("stream.auto.selected", {
                  stream:
                    autoReason === "floor"
                      ? t("stream.auto.floorLabel")
                      : labelFor(playingStream),
                })
              : labelFor(value)}
          </SelectValue>
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
