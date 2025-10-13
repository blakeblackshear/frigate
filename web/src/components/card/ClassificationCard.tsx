import { baseUrl } from "@/api/baseUrl";
import useContextMenu from "@/hooks/use-contextmenu";
import { cn } from "@/lib/utils";
import {
  ClassificationItemData,
  ClassificationThreshold,
} from "@/types/classification";
import { Event } from "@/types/event";
import { useMemo, useRef, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { LuSearch } from "react-icons/lu";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { useNavigate } from "react-router-dom";
import { getTranslatedLabel } from "@/utils/i18n";

type ClassificationCardProps = {
  className?: string;
  imgClassName?: string;
  data: ClassificationItemData;
  threshold?: ClassificationThreshold;
  selected: boolean;
  i18nLibrary: string;
  showArea?: boolean;
  onClick: (data: ClassificationItemData, meta: boolean) => void;
  children?: React.ReactNode;
};
export function ClassificationCard({
  className,
  imgClassName,
  data,
  threshold,
  selected,
  i18nLibrary,
  showArea = true,
  onClick,
  children,
}: ClassificationCardProps) {
  const { t } = useTranslation([i18nLibrary]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const scoreStatus = useMemo(() => {
    if (!data.score || !threshold) {
      return "unknown";
    }

    if (data.score >= threshold.recognition) {
      return "match";
    } else if (data.score >= threshold.unknown) {
      return "potential";
    } else {
      return "unknown";
    }
  }, [data, threshold]);

  // interaction

  const imgRef = useRef<HTMLImageElement | null>(null);

  useContextMenu(imgRef, () => {
    onClick(data, true);
  });

  const imageArea = useMemo(() => {
    if (!showArea || imgRef.current == null || !imageLoaded) {
      return undefined;
    }

    return imgRef.current.naturalWidth * imgRef.current.naturalHeight;
  }, [showArea, imageLoaded]);

  return (
    <>
      <div
        className={cn(
          "relative flex cursor-pointer flex-col rounded-lg outline outline-[3px]",
          className,
          selected
            ? "shadow-selected outline-selected"
            : "outline-transparent duration-500",
        )}
      >
        <div className="relative w-full select-none overflow-hidden rounded-lg">
          <img
            ref={imgRef}
            onLoad={() => setImageLoaded(true)}
            className={cn("size-44", imgClassName, isMobile && "w-full")}
            src={`${baseUrl}${data.filepath}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick(data, e.metaKey || e.ctrlKey);
            }}
          />
          {imageArea != undefined && (
            <div className="absolute bottom-1 right-1 z-10 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
              {t("information.pixels", { ns: "common", area: imageArea })}
            </div>
          )}
        </div>
        <div className="select-none p-2">
          <div className="flex w-full flex-row items-center justify-between gap-2">
            <div className="flex flex-col items-start text-xs text-primary-variant">
              <div className="smart-capitalize">
                {data.name == "unknown" ? t("details.unknown") : data.name}
              </div>
              {data.score && (
                <div
                  className={cn(
                    "",
                    scoreStatus == "match" && "text-success",
                    scoreStatus == "potential" && "text-orange-400",
                    scoreStatus == "unknown" && "text-danger",
                  )}
                >
                  {Math.round(data.score * 100)}%
                </div>
              )}
            </div>
            <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type GroupedClassificationCardProps = {
  group: ClassificationItemData[];
  event?: Event;
  threshold?: ClassificationThreshold;
  selectedItems: string[];
  i18nLibrary: string;
  objectType: string;
  onClick: (data: ClassificationItemData | undefined) => void;
  onSelectEvent: (event: Event) => void;
  children?: (data: ClassificationItemData) => React.ReactNode;
};
export function GroupedClassificationCard({
  group,
  event,
  threshold,
  selectedItems,
  i18nLibrary,
  objectType,
  onClick,
  onSelectEvent,
  children,
}: GroupedClassificationCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(["views/explore", i18nLibrary]);

  // data

  const allItemsSelected = useMemo(
    () => group.every((data) => selectedItems.includes(data.filename)),
    [group, selectedItems],
  );

  const time = useMemo(() => {
    const item = group[0];

    if (!item?.timestamp) {
      return undefined;
    }

    return item.timestamp * 1000;
  }, [group]);

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-lg bg-card p-2 outline outline-[3px]",
        isMobile && "w-full",
        allItemsSelected
          ? "shadow-selected outline-selected"
          : "outline-transparent duration-500",
      )}
      onClick={() => {
        if (selectedItems.length) {
          onClick(undefined);
        }
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick(undefined);
      }}
    >
      <div className="flex flex-row justify-between">
        <div className="flex flex-col gap-1">
          <div className="select-none smart-capitalize">
            {getTranslatedLabel(objectType)}
            {event?.sub_label
              ? `: ${event.sub_label} (${Math.round((event.data.sub_label_score || 0) * 100)}%)`
              : ": " + t("details.unknown")}
          </div>
          {time && (
            <TimeAgo
              className="text-sm text-secondary-foreground"
              time={time}
              dense
            />
          )}
        </div>
        {event && (
          <Tooltip>
            <TooltipTrigger>
              <div
                className="cursor-pointer"
                onClick={() => {
                  navigate(`/explore?event_id=${event.id}`);
                }}
              >
                <LuSearch className="size-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>
                {t("details.item.button.viewInExplore", {
                  ns: "views/explore",
                })}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        )}
      </div>

      <div
        className={cn(
          "gap-2",
          isDesktop
            ? "flex flex-row flex-wrap"
            : "grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-6",
        )}
      >
        {group.map((data: ClassificationItemData) => (
          <ClassificationCard
            key={data.filename}
            data={data}
            threshold={threshold}
            selected={
              allItemsSelected ? false : selectedItems.includes(data.filename)
            }
            i18nLibrary={i18nLibrary}
            onClick={(data, meta) => {
              if (meta || selectedItems.length > 0) {
                onClick(data);
              } else if (event) {
                onSelectEvent(event);
              }
            }}
          >
            {children?.(data)}
          </ClassificationCard>
        ))}
      </div>
    </div>
  );
}
