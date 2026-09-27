import { baseUrl } from "@/api/baseUrl";
import useContextMenu from "@/hooks/use-contextmenu";
import { useOverlayState } from "@/hooks/use-overlay-state";
import { cn } from "@/lib/utils";
import {
  ClassificationItemData,
  ClassificationThreshold,
  ClassifiedEvent,
} from "@/types/classification";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { isDesktop, isIOS, isMobile, isMobileOnly } from "react-device-detect";
import { useTranslation } from "react-i18next";
import TimeAgo from "../dynamic/TimeAgo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { LuSearch, LuInfo } from "react-icons/lu";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { useNavigate } from "react-router-dom";
import { HiSquare2Stack } from "react-icons/hi2";
import scrollIntoView from "scroll-into-view-if-needed";
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
  clickable: boolean;
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
    clickable,
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

  const cardRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useImperativeHandle(ref, () => cardRef.current!);

  // Listen on the whole card, since overlays cover most of the image

  useContextMenu(cardRef, () => {
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
      ref={cardRef}
      className={cn(
        "relative flex size-full select-none flex-col overflow-hidden rounded-lg outline outline-[3px]",
        className,
        selected
          ? "shadow-selected outline-selected"
          : "outline-transparent duration-500",
        clickable && "cursor-pointer",
      )}
      onClick={(e) => {
        const isMeta = e.metaKey || e.ctrlKey;
        if (isMeta) {
          e.stopPropagation();
        }
        onClick(data, isMeta);
      }}
      style={isIOS ? { WebkitTouchCallout: "none" } : undefined}
    >
      <img
        ref={imgRef}
        className={cn(
          "absolute bottom-0 left-0 right-0 top-0 size-full",
          imgClassName,
          isMobile && "w-full",
        )}
        draggable={false}
        loading="lazy"
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
      <div className="absolute bottom-0 flex w-full flex-row items-center justify-between gap-2 p-2">
        <div
          className={cn(
            "flex flex-col items-start text-white",
            data.score != undefined ? "text-xs" : "text-sm",
          )}
        >
          <div className="break-all smart-capitalize">
            {data.name.toLowerCase() == "unknown"
              ? t("details.unknown")
              : data.name.toLowerCase() == "none"
                ? t("details.none")
                : data.name}
          </div>
          {data.score != undefined && (
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
  classifiedEvent?: ClassifiedEvent;
  threshold?: ClassificationThreshold;
  selectedItems: string[];
  i18nLibrary: string;
  objectType: string;
  noClassificationLabel?: string;
  onClick: (data: ClassificationItemData | undefined) => void;
  children?: (data: ClassificationItemData) => React.ReactNode;
};
export function GroupedClassificationCard({
  group,
  classifiedEvent,
  threshold,
  selectedItems,
  i18nLibrary,
  noClassificationLabel = "details.none",
  onClick,
  children,
}: GroupedClassificationCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(["views/explore", i18nLibrary]);
  const [detailOpen, setDetailOpen] = useState(false);

  // Explore stores this event in history state so going back can point out the
  // card the user came from

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [returnEventId, setReturnEventId] = useOverlayState<string | undefined>(
    "returnEventId",
  );
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (!returnEventId || classifiedEvent?.id !== returnEventId) {
      return;
    }

    setReturnEventId(undefined, true);
    setHighlighted(true);
  }, [classifiedEvent?.id, returnEventId, setReturnEventId]);

  useEffect(() => {
    if (!highlighted) {
      return;
    }

    if (cardRef.current) {
      scrollIntoView(cardRef.current, {
        block: "center",
        behavior: "smooth",
        scrollMode: "if-needed",
      });
    }

    const timeout = setTimeout(() => setHighlighted(false), 3000);
    return () => clearTimeout(timeout);
  }, [highlighted]);

  // If the component unmounts while the detail overlay is open, we need to
  // pop the history state that was pushed by useHistoryBack, otherwise it
  // leaves a stale entry that breaks back navigation.
  const detailOpenRef = useRef(detailOpen);
  useEffect(() => {
    detailOpenRef.current = detailOpen;
  }, [detailOpen]);

  useEffect(() => {
    return () => {
      // Only pop the state if we are still sitting on the overlayOpen history entry.
      // This prevents the unmount from undoing cross-page routing if the unmount
      // was caused by navigating away to a different view.
      if (detailOpenRef.current && window.history.state?.overlayOpen) {
        window.history.back();
      }
    };
  }, []);

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
      best = group.at(-1)!;
    }

    const bestTyped: ClassificationItemData = best;
    return {
      ...bestTyped,
      name:
        classifiedEvent?.label && classifiedEvent.label !== "none"
          ? classifiedEvent.label
          : classifiedEvent
            ? t(noClassificationLabel)
            : bestTyped.name,
      score: classifiedEvent?.score,
    };
  }, [group, classifiedEvent, noClassificationLabel, t]);

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
  const Content = isDesktop ? DialogContent : MobilePageContent;
  const Header = isDesktop ? DialogHeader : MobilePageHeader;
  const ContentTitle = isDesktop ? DialogTitle : MobilePageTitle;
  const ContentDescription = isDesktop
    ? DialogDescription
    : MobilePageDescription;

  return (
    <>
      <ClassificationCard
        ref={cardRef}
        data={bestItem}
        threshold={threshold}
        selected={highlighted || selectedItems.includes(bestItem.filename)}
        clickable={true}
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
            "scrollbar-container",
            isDesktop && "min-w-[50%] max-w-[65%]",
            isMobile && "overflow-y-auto",
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <>
            <Header
              className={cn(
                "mx-2 flex flex-row items-center gap-4",
                isMobileOnly && "top-0 mx-4",
              )}
            >
              <div
                className={cn(
                  "",
                  isMobile && "flex flex-col items-center justify-center",
                )}
              >
                <ContentTitle className="flex items-center gap-2 font-normal capitalize">
                  {classifiedEvent?.label && classifiedEvent.label !== "none"
                    ? classifiedEvent.label
                    : t(noClassificationLabel, { ns: i18nLibrary })}
                  {classifiedEvent?.label &&
                    classifiedEvent.label !== "none" &&
                    classifiedEvent.score !== undefined && (
                      <div className="flex items-center gap-1">
                        <div
                          className={cn(
                            "",
                            bestScoreStatus == "match" && "text-success",
                            bestScoreStatus == "potential" && "text-orange-400",
                            bestScoreStatus == "unknown" && "text-danger",
                          )}
                        >{`${Math.round((classifiedEvent.score || 0) * 100)}%`}</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="focus:outline-none"
                              aria-label={t("details.scoreInfo", {
                                ns: i18nLibrary,
                              })}
                            >
                              <LuInfo className="size-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 text-sm">
                            {t("details.scoreInfo", { ns: i18nLibrary })}
                          </PopoverContent>
                        </Popover>
                      </div>
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
              {classifiedEvent && (
                <div
                  className={cn(
                    "flex",
                    isDesktop && "flex-row justify-between",
                    isMobile && "absolute right-4 top-8",
                  )}
                >
                  <Tooltip open={isDesktop ? undefined : false}>
                    <TooltipTrigger asChild>
                      <div
                        className="cursor-pointer"
                        tabIndex={-1}
                        aria-label={t("details.item.button.viewInExplore", {
                          ns: "views/explore",
                        })}
                        onClick={() => {
                          setReturnEventId(classifiedEvent.id, true);
                          navigate(`/explore?event_id=${classifiedEvent.id}`, {
                            state: { canGoBack: true },
                          });
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
                </div>
              )}
            </Header>
            <div
              className={cn(
                "grid w-full auto-rows-min grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-8",
                isDesktop && "p-2",
                isMobile && "px-4 pb-4",
              )}
            >
              {group.map((data: ClassificationItemData) => (
                <div key={data.filename} className="aspect-square w-full">
                  <ClassificationCard
                    data={data}
                    threshold={threshold}
                    selected={false}
                    clickable={false}
                    i18nLibrary={i18nLibrary}
                    onClick={() => {}}
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
