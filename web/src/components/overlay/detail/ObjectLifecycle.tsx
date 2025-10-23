import useSWR from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Event } from "@/types/event";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import { ObjectLifecycleSequence } from "@/types/timeline";
import Heading from "@/components/ui/heading";
import { ReviewDetailPaneType } from "@/types/review";
import { FrigateConfig } from "@/types/frigateConfig";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { getIconForLabel } from "@/utils/iconUtil";
import {
  LuCircle,
  LuCircleDot,
  LuEar,
  LuFolderX,
  LuPlay,
  LuSettings,
  LuTruck,
} from "react-icons/lu";
import { IoMdArrowRoundBack, IoMdExit } from "react-icons/io";
import {
  MdFaceUnlock,
  MdOutlineLocationOn,
  MdOutlinePictureInPictureAlt,
} from "react-icons/md";
import { cn } from "@/lib/utils";
import { useApiHost } from "@/api";
import { isDesktop, isIOS, isSafari } from "react-device-detect";
import ImageLoadingIndicator from "@/components/indicators/ImageLoadingIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnnotationSettingsPane } from "./AnnotationSettingsPane";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useNavigate } from "react-router-dom";
import { ObjectPath } from "./ObjectPath";
import { getLifecycleItemDescription } from "@/utils/lifecycleUtil";
import { IoPlayCircleOutline } from "react-icons/io5";
import { Trans, useTranslation } from "react-i18next";
import { getTranslatedLabel } from "@/utils/i18n";
import { resolveZoneName } from "@/hooks/use-zone-friendly-name";

type ObjectLifecycleProps = {
  className?: string;
  event: Event;
  fullscreen?: boolean;
  setPane: React.Dispatch<React.SetStateAction<ReviewDetailPaneType>>;
};

export default function ObjectLifecycle({
  className,
  event,
  fullscreen = false,
  setPane,
}: ObjectLifecycleProps) {
  const { t } = useTranslation(["views/explore"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: eventSequence } = useSWR<ObjectLifecycleSequence[]>([
    "timeline",
    {
      source_id: event.id,
    },
  ]);

  eventSequence?.map((event) => {
    event.data.zones_friendly_names = event.data?.zones?.map((zone) => {
      return resolveZoneName(config, zone);
    });
  });

  const apiHost = useApiHost();
  const navigate = useNavigate();

  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const [selectedZone, setSelectedZone] = useState("");
  const [lifecycleZones, setLifecycleZones] = useState<string[]>([]);
  const [showControls, setShowControls] = useState(false);
  const [showZones, setShowZones] = useState(true);

  const aspectRatio = useMemo(() => {
    if (!config) {
      return 16 / 9;
    }

    return (
      config.cameras[event.camera].detect.width /
      config.cameras[event.camera].detect.height
    );
  }, [config, event]);

  const getZoneColor = useCallback(
    (zoneName: string) => {
      const zoneColor =
        config?.cameras?.[event.camera]?.zones?.[zoneName]?.color;
      if (zoneColor) {
        const reversed = [...zoneColor].reverse();
        return reversed;
      }
    },
    [config, event],
  );

  const getObjectColor = useCallback(
    (label: string) => {
      const objectColor = config?.model?.colormap[label];
      if (objectColor) {
        const reversed = [...objectColor].reverse();
        return reversed;
      }
    },
    [config],
  );

  const getZonePolygon = useCallback(
    (zoneName: string) => {
      if (!imgRef.current || !config) {
        return;
      }
      const zonePoints =
        config?.cameras[event.camera].zones[zoneName].coordinates;
      const imgElement = imgRef.current;
      const imgRect = imgElement.getBoundingClientRect();

      return zonePoints
        .split(",")
        .map(Number.parseFloat)
        .reduce((acc, value, index) => {
          const isXCoordinate = index % 2 === 0;
          const coordinate = isXCoordinate
            ? value * imgRect.width
            : value * imgRect.height;
          acc.push(coordinate);
          return acc;
        }, [] as number[])
        .join(",");
    },
    [config, imgRef, event],
  );

  const [boxStyle, setBoxStyle] = useState<React.CSSProperties | null>(null);
  const [attributeBoxStyle, setAttributeBoxStyle] =
    useState<React.CSSProperties | null>(null);

  const configAnnotationOffset = useMemo(() => {
    if (!config) {
      return 0;
    }

    return config.cameras[event.camera]?.detect?.annotation_offset || 0;
  }, [config, event]);

  const [annotationOffset, setAnnotationOffset] = useState<number>(
    configAnnotationOffset,
  );

  const savedPathPoints = useMemo(() => {
    return (
      event.data.path_data?.map(([coords, timestamp]: [number[], number]) => ({
        x: coords[0],
        y: coords[1],
        timestamp,
        lifecycle_item: undefined,
      })) || []
    );
  }, [event.data.path_data]);

  const eventSequencePoints = useMemo(() => {
    return (
      eventSequence
        ?.filter((event) => event.data.box !== undefined)
        .map((event) => {
          const [left, top, width, height] = event.data.box!;

          return {
            x: left + width / 2, // Center x-coordinate
            y: top + height, // Bottom y-coordinate
            timestamp: event.timestamp,
            lifecycle_item: event,
          };
        }) || []
    );
  }, [eventSequence]);

  // final object path with timeline points included
  const pathPoints = useMemo(() => {
    // don't display a path if we don't have any saved path points
    if (
      savedPathPoints.length === 0 ||
      config?.cameras[event.camera]?.onvif.autotracking.enabled_in_config
    )
      return [];
    return [...savedPathPoints, ...eventSequencePoints].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
  }, [savedPathPoints, eventSequencePoints, config, event]);

  const [timeIndex, setTimeIndex] = useState(0);

  const handleSetBox = useCallback(
    (box: number[], attrBox: number[] | undefined) => {
      if (imgRef.current && Array.isArray(box) && box.length === 4) {
        const imgElement = imgRef.current;
        const imgRect = imgElement.getBoundingClientRect();

        const style = {
          left: `${box[0] * imgRect.width}px`,
          top: `${box[1] * imgRect.height}px`,
          width: `${box[2] * imgRect.width}px`,
          height: `${box[3] * imgRect.height}px`,
          borderColor: `rgb(${getObjectColor(event.label)?.join(",")})`,
        };

        if (attrBox) {
          const attrStyle = {
            left: `${attrBox[0] * imgRect.width}px`,
            top: `${attrBox[1] * imgRect.height}px`,
            width: `${attrBox[2] * imgRect.width}px`,
            height: `${attrBox[3] * imgRect.height}px`,
            borderColor: `rgb(${getObjectColor(event.label)?.join(",")})`,
          };
          setAttributeBoxStyle(attrStyle);
        } else {
          setAttributeBoxStyle(null);
        }

        setBoxStyle(style);
      }
    },
    [imgRef, event, getObjectColor],
  );

  // image

  const [src, setSrc] = useState(
    `${apiHost}api/${event.camera}/recordings/${event.start_time + annotationOffset / 1000}/snapshot.jpg?height=500`,
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (timeIndex) {
      const newSrc = `${apiHost}api/${event.camera}/recordings/${timeIndex + annotationOffset / 1000}/snapshot.jpg?height=500`;
      setSrc(newSrc);
    }
    setImgLoaded(false);
    setHasError(false);
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeIndex, annotationOffset]);

  // carousels

  // Selected lifecycle item index; -1 when viewing a path-only point

  const handlePathPointClick = useCallback(
    (index: number) => {
      if (!eventSequence) return;
      const sequenceIndex = eventSequence.findIndex(
        (item) => item.timestamp === pathPoints[index].timestamp,
      );
      if (sequenceIndex !== -1) {
        setTimeIndex(eventSequence[sequenceIndex].timestamp);
        handleSetBox(
          eventSequence[sequenceIndex]?.data.box ?? [],
          eventSequence[sequenceIndex]?.data?.attribute_box,
        );
        setLifecycleZones(eventSequence[sequenceIndex]?.data.zones);
      } else {
        // click on a normal path point, not a lifecycle point
        setTimeIndex(pathPoints[index].timestamp);
        setBoxStyle(null);
        setLifecycleZones([]);
      }
    },
    [eventSequence, pathPoints, handleSetBox],
  );

  const formattedStart = config
    ? formatUnixTimestampToDateTime(event.start_time ?? 0, {
        timezone: config.ui.timezone,
        date_format:
          config.ui.time_format == "24hour"
            ? t("time.formattedTimestampHourMinuteSecond.24hour", {
                ns: "common",
              })
            : t("time.formattedTimestampHourMinuteSecond.12hour", {
                ns: "common",
              }),
        time_style: "medium",
        date_style: "medium",
      })
    : "";

  const formattedEnd = config
    ? formatUnixTimestampToDateTime(event.end_time ?? 0, {
        timezone: config.ui.timezone,
        date_format:
          config.ui.time_format == "24hour"
            ? t("time.formattedTimestampHourMinuteSecond.24hour", {
                ns: "common",
              })
            : t("time.formattedTimestampHourMinuteSecond.12hour", {
                ns: "common",
              }),
        time_style: "medium",
        date_style: "medium",
      })
    : "";

  useEffect(() => {
    if (!eventSequence || eventSequence.length === 0) return;
    // If timeIndex hasn't been set to a non-zero value, prefer the first lifecycle timestamp
    if (!timeIndex) {
      setTimeIndex(eventSequence[0].timestamp);
      handleSetBox(
        eventSequence[0]?.data.box ?? [],
        eventSequence[0]?.data?.attribute_box,
      );
      setLifecycleZones(eventSequence[0]?.data.zones);
    }
  }, [eventSequence, timeIndex, handleSetBox]);

  // When timeIndex changes or image finishes loading, sync the box/zones to matching lifecycle, else clear
  useEffect(() => {
    if (!eventSequence || timeIndex == null) return;
    const idx = eventSequence.findIndex((i) => i.timestamp === timeIndex);
    if (idx !== -1) {
      if (imgLoaded) {
        handleSetBox(
          eventSequence[idx]?.data.box ?? [],
          eventSequence[idx]?.data?.attribute_box,
        );
      }
      setLifecycleZones(eventSequence[idx]?.data.zones);
    } else {
      // Non-lifecycle point (e.g., saved path point)
      setBoxStyle(null);
      setLifecycleZones([]);
    }
  }, [timeIndex, imgLoaded, eventSequence, handleSetBox]);

  const selectedLifecycle = useMemo(() => {
    if (!eventSequence || eventSequence.length === 0) return undefined;
    const idx = eventSequence.findIndex((i) => i.timestamp === timeIndex);
    return idx !== -1 ? eventSequence[idx] : eventSequence[0];
  }, [eventSequence, timeIndex]);

  const selectedIndex = useMemo(() => {
    if (!eventSequence || eventSequence.length === 0) return 0;
    const idx = eventSequence.findIndex((i) => i.timestamp === timeIndex);
    return idx === -1 ? 0 : idx;
  }, [eventSequence, timeIndex]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className={className}>
      {!fullscreen && (
        <div className={cn("flex items-center gap-2")}>
          <Button
            className="mb-2 mt-3 flex items-center gap-2.5 rounded-lg md:mt-0"
            aria-label={t("label.back", { ns: "common" })}
            size="sm"
            onClick={() => setPane("overview")}
          >
            <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
            {isDesktop && (
              <div className="text-primary">
                {t("button.back", { ns: "common" })}
              </div>
            )}
          </Button>
        </div>
      )}

      <div
        className={cn(
          "relative mx-auto flex max-h-[50dvh] flex-row justify-center",
        )}
        style={{
          aspectRatio: !imgLoaded ? aspectRatio : undefined,
        }}
      >
        <ImageLoadingIndicator
          className="absolute inset-0"
          imgLoaded={imgLoaded}
        />
        {hasError && (
          <div className="relative aspect-video">
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <LuFolderX className="size-16" />
              {t("objectLifecycle.noImageFound")}
            </div>
          </div>
        )}
        <div
          className={cn(
            "relative inline-block",
            imgLoaded ? "visible" : "invisible",
          )}
        >
          <ContextMenu>
            <ContextMenuTrigger>
              <img
                key={event.id}
                ref={imgRef}
                className={cn(
                  "max-h-[50dvh] max-w-full select-none rounded-lg object-contain",
                )}
                loading={isSafari ? "eager" : "lazy"}
                style={
                  isIOS
                    ? {
                        WebkitUserSelect: "none",
                        WebkitTouchCallout: "none",
                      }
                    : undefined
                }
                draggable={false}
                src={src}
                onLoad={() => setImgLoaded(true)}
                onError={() => setHasError(true)}
              />

              {showZones &&
                imgRef.current?.width &&
                imgRef.current?.height &&
                lifecycleZones?.map((zone) => (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      width: imgRef.current?.clientWidth,
                      height: imgRef.current?.clientHeight,
                    }}
                    key={zone}
                  >
                    <svg
                      viewBox={`0 0 ${imgRef.current?.width} ${imgRef.current?.height}`}
                      className="absolute inset-0"
                    >
                      <polygon
                        points={getZonePolygon(zone)}
                        className="fill-none stroke-2"
                        style={{
                          stroke: `rgb(${getZoneColor(zone)?.join(",")})`,
                          fill:
                            selectedZone == zone
                              ? `rgba(${getZoneColor(zone)?.join(",")}, 0.5)`
                              : `rgba(${getZoneColor(zone)?.join(",")}, 0.3)`,
                          strokeWidth: selectedZone == zone ? 4 : 2,
                        }}
                      />
                    </svg>
                  </div>
                ))}

              {boxStyle && (
                <div className="absolute border-2" style={boxStyle}>
                  <div className="absolute bottom-[-3px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 transform bg-yellow-500" />
                </div>
              )}
              {attributeBoxStyle && (
                <div className="absolute border-2" style={attributeBoxStyle} />
              )}
              {imgRef.current?.width &&
                imgRef.current?.height &&
                pathPoints &&
                pathPoints.length > 0 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      width: imgRef.current?.clientWidth,
                      height: imgRef.current?.clientHeight,
                    }}
                    key="path"
                  >
                    <svg
                      viewBox={`0 0 ${imgRef.current?.width} ${imgRef.current?.height}`}
                      className="absolute inset-0"
                    >
                      <ObjectPath
                        positions={pathPoints}
                        color={getObjectColor(event.label)}
                        width={2}
                        imgRef={imgRef}
                        onPointClick={handlePathPointClick}
                      />
                    </svg>
                  </div>
                )}
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>
                <div
                  className="flex w-full cursor-pointer items-center justify-start gap-2 p-2"
                  onClick={() =>
                    navigate(
                      `/settings?page=masksAndZones&camera=${event.camera}&object_mask=${selectedLifecycle?.data.box}`,
                    )
                  }
                >
                  <div className="text-primary">
                    {t("objectLifecycle.createObjectMask")}
                  </div>
                </div>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>

      <div className="mt-3 flex flex-row items-center justify-between">
        <Heading as="h4">{t("objectLifecycle.title")}</Heading>

        <div className="flex flex-row gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showControls ? "select" : "default"}
                className="size-7 p-1.5"
                aria-label={t("objectLifecycle.adjustAnnotationSettings")}
              >
                <LuSettings
                  className="size-5"
                  onClick={() => setShowControls(!showControls)}
                />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>
                {t("objectLifecycle.adjustAnnotationSettings")}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
      </div>
      <div className="flex flex-row items-center justify-between">
        <div className="mb-2 text-sm text-muted-foreground">
          {t("objectLifecycle.scrollViewTips")}
        </div>
        <div className="min-w-20 text-right text-sm text-muted-foreground">
          {t("objectLifecycle.count", {
            first: selectedIndex + 1,
            second: eventSequence?.length ?? 0,
          })}
        </div>
      </div>
      {config?.cameras[event.camera]?.onvif.autotracking.enabled_in_config && (
        <div className="-mt-2 mb-2 text-sm text-danger">
          {t("objectLifecycle.autoTrackingTips")}
        </div>
      )}
      {showControls && (
        <AnnotationSettingsPane
          event={event}
          showZones={showZones}
          setShowZones={setShowZones}
          annotationOffset={annotationOffset}
          setAnnotationOffset={setAnnotationOffset}
        />
      )}

      <div className="mt-4">
        <div
          className={cn(
            "rounded-md bg-secondary p-2 outline outline-[3px] -outline-offset-[2.8px] outline-transparent duration-500",
          )}
        >
          <div className="flex w-full items-center justify-between">
            <div
              className="flex items-center gap-2 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                setTimeIndex(event.start_time ?? 0);
              }}
              role="button"
            >
              {getIconForLabel(
                event.label,
                "size-6 text-primary dark:text-white",
              )}
              <div className="flex items-end gap-2">
                <span>{getTranslatedLabel(event.label)}</span>
                <span className="text-secondary-foreground">
                  {formattedStart ?? ""} - {formattedEnd ?? ""}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            {!eventSequence ? (
              <ActivityIndicator className="size-2" size={2} />
            ) : eventSequence.length === 0 ? (
              <div className="py-2 text-muted-foreground">
                {t("detail.noObjectDetailData", { ns: "views/events" })}
              </div>
            ) : (
              <div className="mx-2 mt-4 space-y-2">
                {eventSequence.map((item, idx) => {
                  const isActive =
                    Math.abs((timeIndex ?? 0) - (item.timestamp ?? 0)) <= 0.5;
                  const formattedEventTimestamp = config
                    ? formatUnixTimestampToDateTime(item.timestamp ?? 0, {
                        timezone: config.ui.timezone,
                        date_format:
                          config.ui.time_format == "24hour"
                            ? t(
                                "time.formattedTimestampHourMinuteSecond.24hour",
                                { ns: "common" },
                              )
                            : t(
                                "time.formattedTimestampHourMinuteSecond.12hour",
                                { ns: "common" },
                              ),
                        time_style: "medium",
                        date_style: "medium",
                      })
                    : "";

                  const ratio =
                    Array.isArray(item.data.box) && item.data.box.length >= 4
                      ? (
                          aspectRatio *
                          (item.data.box[2] / item.data.box[3])
                        ).toFixed(2)
                      : "N/A";
                  const areaPx =
                    Array.isArray(item.data.box) && item.data.box.length >= 4
                      ? Math.round(
                          (config.cameras[event.camera]?.detect?.width ?? 0) *
                            (config.cameras[event.camera]?.detect?.height ??
                              0) *
                            (item.data.box[2] * item.data.box[3]),
                        )
                      : undefined;
                  const areaPct =
                    Array.isArray(item.data.box) && item.data.box.length >= 4
                      ? (item.data.box[2] * item.data.box[3]).toFixed(4)
                      : undefined;

                  return (
                    <div
                      key={`${item.timestamp}-${item.source_id ?? ""}-${idx}`}
                      role="button"
                      onClick={() => {
                        setTimeIndex(item.timestamp ?? 0);
                        handleSetBox(
                          item.data.box ?? [],
                          item.data.attribute_box,
                        );
                        setLifecycleZones(item.data.zones);
                        setSelectedZone("");
                      }}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-md p-2 text-sm text-primary-variant",
                        isActive
                          ? "bg-secondary-highlight font-semibold text-primary outline-[1.5px] -outline-offset-[1.1px] outline-primary/40 dark:font-normal"
                          : "duration-500",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center">
                          <LifecycleIcon
                            lifecycleItem={item}
                            className="size-5"
                          />
                        </div>
                        <div className="flex w-full flex-row justify-between">
                          <Trans>
                            <div>{getLifecycleItemDescription(item)}</div>
                          </Trans>
                          <div className={cn("p-1 text-sm")}>
                            {formattedEventTimestamp}
                          </div>
                        </div>
                      </div>

                      <div className="ml-8 mt-1 flex flex-wrap items-center gap-3 text-sm text-secondary-foreground">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              {t(
                                "objectLifecycle.lifecycleItemDesc.header.ratio",
                              )}
                            </span>
                            <span className="font-medium text-foreground">
                              {ratio}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              {t(
                                "objectLifecycle.lifecycleItemDesc.header.area",
                              )}
                            </span>
                            {areaPx !== undefined && areaPct !== undefined ? (
                              <span className="font-medium text-foreground">
                                px: {areaPx} · %: {areaPct}
                              </span>
                            ) : (
                              <span>N/A</span>
                            )}
                          </div>
                          {item.class_type === "entered_zone" && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {t(
                                  "objectLifecycle.lifecycleItemDesc.header.zones",
                                )}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                {item.data.zones.map((zone, zidx) => (
                                  <div
                                    key={`${zone}-${zidx}`}
                                    className="flex cursor-pointer items-center gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedZone(zone);
                                    }}
                                  >
                                    <div
                                      className="size-3 rounded"
                                      style={{
                                        backgroundColor: `rgb(${getZoneColor(zone)})`,
                                      }}
                                    />
                                    <span className="smart-capitalize">
                                      {item.data?.zones_friendly_names?.[
                                        zidx
                                      ] ?? zone.replaceAll("_", " ")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type GetTimelineIconParams = {
  lifecycleItem: ObjectLifecycleSequence;
  className?: string;
};

export function LifecycleIcon({
  lifecycleItem,
  className,
}: GetTimelineIconParams) {
  switch (lifecycleItem.class_type) {
    case "visible":
      return <LuPlay className={cn(className)} />;
    case "gone":
      return <IoMdExit className={cn(className)} />;
    case "active":
      return <IoPlayCircleOutline className={cn(className)} />;
    case "stationary":
      return <LuCircle className={cn(className)} />;
    case "entered_zone":
      return <MdOutlineLocationOn className={cn(className)} />;
    case "attribute":
      switch (lifecycleItem.data?.attribute) {
        case "face":
          return <MdFaceUnlock className={cn(className)} />;
        case "license_plate":
          return <MdOutlinePictureInPictureAlt className={cn(className)} />;
        default:
          return <LuTruck className={cn(className)} />;
      }
    case "heard":
      return <LuEar className={cn(className)} />;
    case "external":
      return <LuCircleDot className={cn(className)} />;
    default:
      return null;
  }
}
