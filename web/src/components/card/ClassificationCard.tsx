import { baseUrl } from "@/api/baseUrl";
import useContextMenu from "@/hooks/use-contextmenu";
import { cn } from "@/lib/utils";
import {
  ClassificationItemData,
  ClassificationThreshold,
} from "@/types/classification";
import { Event } from "@/types/event";
import { forwardRef, useMemo, useRef, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { LuSearch } from "react-icons/lu";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { useNavigate } from "react-router-dom";
import { HiSquare2Stack } from "react-icons/hi2";
import { ImageShadowOverlay } from "../overlay/ImageShadowOverlay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  MobilePage,
  MobilePageContent,
  MobilePageDescription,
  MobilePageHeader,
  MobilePageTitle,
  MobilePageTrigger,
} from "../mobile/MobilePage";

type ClassificationCardProps = {
  className?: string;
  imgClassName?: string;
  data: ClassificationItemData;
  threshold?: ClassificationThreshold;
  selected: boolean;
  i18nLibrary: string;
  showArea?: boolean;
  count?: number;
  onClick: (data: ClassificationItemData, meta: boolean) => void;
  children?: React.ReactNode;
};
export const ClassificationCard = forwardRef<
  HTMLDivElement,
  ClassificationCardProps
>(function ClassificationCard(
  {
    className,
    imgClassName,
    data,
    threshold,
    selected,
    i18nLibrary,
    showArea = true,
    count,
    onClick,
    children,
  },
  ref,
) {
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
    <div
      ref={ref}
      className={cn(
        "relative flex size-full cursor-pointer flex-col overflow-hidden rounded-lg outline outline-[3px]",
        className,
        selected
          ? "shadow-selected outline-selected"
          : "outline-transparent duration-500",
      )}
      onClick={(e) => {
        const isMeta = e.metaKey || e.ctrlKey;
        if (isMeta) {
          e.stopPropagation();
        }
        onClick(data, isMeta);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(data, true);
      }}
    >
      <img
        ref={imgRef}
        className={cn(
          "absolute bottom-0 left-0 right-0 top-0 size-full",
          imgClassName,
          isMobile && "w-full",
        )}
        onLoad={() => setImageLoaded(true)}
        src={`${baseUrl}${data.filepath}`}
      />
      <ImageShadowOverlay upperClassName="z-0" lowerClassName="h-[30%] z-0" />
      {count && (
        <div className="absolute right-2 top-2 flex flex-row items-center gap-1">
          <div className="text-gray-200">{count}</div>{" "}
          <HiSquare2Stack className="text-gray-200" />
        </div>
      )}
      {!count && imageArea != undefined && (
        <div className="absolute right-1 top-1 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
          {t("information.pixels", { ns: "common", area: imageArea })}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-0 flex w-full select-none flex-row items-center justify-between gap-2 p-2">
        <div
          className={cn(
            "flex flex-col items-start text-white",
            data.score ? "text-xs" : "text-sm",
          )}
        >
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
        <div className="flex flex-row items-start justify-end gap-5 md:gap-2">
          {children}
        </div>
      </div>
    </div>
  );
});

type GroupedClassificationCardProps = {
  group: ClassificationItemData[];
  event?: Event;
  threshold?: ClassificationThreshold;
  selectedItems: string[];
  i18nLibrary: string;
  objectType: string;
  onClick: (data: ClassificationItemData | undefined) => void;
  children?: (data: ClassificationItemData) => React.ReactNode;
};
export function GroupedClassificationCard({
  group,
  event,
  threshold,
  selectedItems,
  i18nLibrary,
  onClick,
  children,
}: GroupedClassificationCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(["views/explore", i18nLibrary]);
  const [detailOpen, setDetailOpen] = useState(false);

  // data

  const bestItem = useMemo<ClassificationItemData | undefined>(() => {
    let best: undefined | ClassificationItemData = undefined;

    group.forEach((item) => {
      if (item?.name != undefined && item.name != "none") {
        if (
          best?.score == undefined ||
          (item.score && best.score < item.score)
        ) {
          best = item;
        }
      }
    });

    if (!best) {
      return group.at(-1);
    }

    const bestTyped: ClassificationItemData = best;
    return {
      ...bestTyped,
      name: event ? (event.sub_label ?? "") : bestTyped.name,
      score: event?.data?.sub_label_score || bestTyped.score,
    };
  }, [group, event]);

  const bestScoreStatus = useMemo(() => {
    if (!bestItem?.score || !threshold) {
      return "unknown";
    }

    if (bestItem.score >= threshold.recognition) {
      return "match";
    } else if (bestItem.score >= threshold.unknown) {
      return "potential";
    } else {
      return "unknown";
    }
  }, [bestItem, threshold]);

  const time = useMemo(() => {
    const item = group[0];

    if (!item?.timestamp) {
      return undefined;
    }

    return item.timestamp * 1000;
  }, [group]);

  if (!bestItem) {
    return null;
  }

  const Overlay = isDesktop ? Dialog : MobilePage;
  const Trigger = isDesktop ? DialogTrigger : MobilePageTrigger;
  const Header = isDesktop ? DialogHeader : MobilePageHeader;
  const Content = isDesktop ? DialogContent : MobilePageContent;
  const ContentTitle = isDesktop ? DialogTitle : MobilePageTitle;
  const ContentDescription = isDesktop
    ? DialogDescription
    : MobilePageDescription;

  return (
    <>
      <ClassificationCard
        data={bestItem}
        threshold={threshold}
        selected={selectedItems.includes(bestItem.filename)}
        i18nLibrary={i18nLibrary}
        count={group.length}
        onClick={(_, meta) => {
          if (meta || selectedItems.length > 0) {
            onClick(undefined);
          } else {
            setDetailOpen(true);
          }
        }}
      />
      <Overlay
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDetailOpen(false);
          }
        }}
      >
        <Trigger asChild></Trigger>
        <Content
          className={cn(
            "",
            isDesktop && "min-w-[50%] max-w-[65%]",
            isMobile && "flex flex-col",
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <>
            <Header
              className={cn(
                "mx-2 flex flex-row items-center gap-4",
                isMobile && "flex-shrink-0",
              )}
            >
              <div>
                <ContentTitle
                  className={cn(
                    "flex items-center gap-1 font-normal capitalize",
                    isMobile && "px-2",
                  )}
                >
                  {event?.sub_label ? event.sub_label : t("details.unknown")}
                  {event?.sub_label && (
                    <div
                      className={cn(
                        "",
                        bestScoreStatus == "match" && "text-success",
                        bestScoreStatus == "potential" && "text-orange-400",
                        bestScoreStatus == "unknown" && "text-danger",
                      )}
                    >{`${Math.round((event.data.sub_label_score || 0) * 100)}%`}</div>
                  )}
                </ContentTitle>
                <ContentDescription className={cn("", isMobile && "px-2")}>
                  {time && (
                    <TimeAgo
                      className="text-sm text-secondary-foreground"
                      time={time}
                      dense
                    />
                  )}
                </ContentDescription>
              </div>
              {isDesktop && (
                <div className="flex flex-row justify-between">
                  {event && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="cursor-pointer"
                          tabIndex={-1}
                          onClick={() => {
                            navigate(`/explore?event_id=${event.id}`);
                          }}
                        >
                          <LuSearch className="size-4 text-secondary-foreground" />
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
              )}
            </Header>
            <div
              className={cn(
                "grid w-full auto-rows-min grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-8",
                isDesktop && "p-2",
                isMobile && "scrollbar-container flex-1 overflow-y-auto",
              )}
            >
              {group.map((data: ClassificationItemData) => (
                <div key={data.filename} className="aspect-square w-full">
                  <ClassificationCard
                    data={data}
                    threshold={threshold}
                    selected={false}
                    i18nLibrary={i18nLibrary}
                    onClick={(data, meta) => {
                      if (meta || selectedItems.length > 0) {
                        onClick(data);
                      }
                    }}
                  >
                    {children?.(data)}
                  </ClassificationCard>
                </div>
              ))}
            </div>
          </>
        </Content>
      </Overlay>
    </>
  );
}
