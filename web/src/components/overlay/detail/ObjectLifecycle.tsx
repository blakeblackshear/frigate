import useSWR from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Event } from "@/types/event";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
  LuPlayCircle,
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
import { Card, CardContent } from "@/components/ui/card";
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
  const { data: eventSequence } = useSWR<ObjectLifecycleSequence[]>([
    "timeline",
    {
      source_id: event.id,
    },
  ]);

  const { data: config } = useSWR<FrigateConfig>("config");
  const apiHost = useApiHost();

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
        .map(parseFloat)
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

  const configAnnotationOffset = useMemo(() => {
    if (!config) {
      return 0;
    }

    return config.cameras[event.camera]?.detect?.annotation_offset || 0;
  }, [config, event]);

  const [annotationOffset, setAnnotationOffset] = useState<number>(
    configAnnotationOffset,
  );

  const detectArea = useMemo(() => {
    if (!config) {
      return 0;
    }
    return (
      config.cameras[event.camera]?.detect?.width *
      config.cameras[event.camera]?.detect?.height
    );
  }, [config, event.camera]);

  const [timeIndex, setTimeIndex] = useState(0);

  const handleSetBox = useCallback(
    (box: number[]) => {
      if (imgRef.current && Array.isArray(box) && box.length === 4) {
        const imgElement = imgRef.current;
        const imgRect = imgElement.getBoundingClientRect();

        const style = {
          left: `${box[0] * imgRect.width}px`,
          top: `${box[1] * imgRect.height}px`,
          width: `${box[2] * imgRect.width}px`,
          height: `${box[3] * imgRect.height}px`,
        };

        setBoxStyle(style);
      }
    },
    [imgRef],
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

  const [mainApi, setMainApi] = useState<CarouselApi>();
  const [thumbnailApi, setThumbnailApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const handleThumbnailClick = (index: number) => {
    if (!mainApi || !thumbnailApi) {
      return;
    }
    mainApi.scrollTo(index);
    setCurrent(index);
  };

  const handleThumbnailNavigation = useCallback(
    (direction: "next" | "previous") => {
      if (!mainApi || !thumbnailApi || !eventSequence) return;
      const newIndex =
        direction === "next"
          ? Math.min(current + 1, eventSequence.length - 1)
          : Math.max(current - 1, 0);
      mainApi.scrollTo(newIndex);
      thumbnailApi.scrollTo(newIndex);
      setCurrent(newIndex);
    },
    [mainApi, thumbnailApi, current, eventSequence],
  );

  useEffect(() => {
    if (eventSequence && eventSequence.length > 0) {
      setTimeIndex(eventSequence?.[current].timestamp);
      handleSetBox(eventSequence?.[current].data.box ?? []);
      setLifecycleZones(eventSequence?.[current].data.zones);
      setSelectedZone("");
    }
  }, [current, imgLoaded, handleSetBox, eventSequence]);

  useEffect(() => {
    if (!mainApi || !thumbnailApi || !eventSequence || !event) {
      return;
    }

    const handleTopSelect = () => {
      const selected = mainApi.selectedScrollSnap();
      setCurrent(selected);
      thumbnailApi.scrollTo(selected);
    };

    mainApi.on("select", handleTopSelect).on("reInit", handleTopSelect);

    return () => {
      mainApi.off("select", handleTopSelect);
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainApi, thumbnailApi]);

  if (!event.id || !eventSequence || !config || !timeIndex) {
    return <ActivityIndicator />;
  }

  return (
    <div className={className}>
      {!fullscreen && (
        <div className={cn("flex items-center gap-2")}>
          <Button
            className="mb-2 mt-3 flex items-center gap-2.5 rounded-lg md:mt-0"
            aria-label="Go back"
            size="sm"
            onClick={() => setPane("overview")}
          >
            <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
            {isDesktop && <div className="text-primary">Back</div>}
          </Button>
        </div>
      )}

      <div
        className={cn(
          "relative mx-auto flex max-h-[50dvh] flex-row justify-center",
          !imgLoaded && aspectRatio < 16 / 9 && "h-full",
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
              No image found for this timestamp.
            </div>
          </div>
        )}
        <div
          className={cn(
            "relative inline-block",
            imgLoaded ? "visible" : "invisible",
          )}
        >
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
            <div className="absolute border-2 border-red-600" style={boxStyle}>
              <div className="absolute bottom-[-3px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 transform bg-yellow-500" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-row items-center justify-between">
        <Heading as="h4">Object Lifecycle</Heading>

        <div className="flex flex-row gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showControls ? "select" : "default"}
                className="size-7 p-1.5"
                aria-label="Adjust annotation settings"
              >
                <LuSettings
                  className="size-5"
                  onClick={() => setShowControls(!showControls)}
                />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>Adjust annotation settings</TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
      </div>
      <div className="flex flex-row items-center justify-between">
        <div className="mb-2 text-sm text-muted-foreground">
          Scroll to view the significant moments of this object's lifecycle.
        </div>
        <div className="min-w-20 text-right text-sm text-muted-foreground">
          {current + 1} of {eventSequence.length}
        </div>
      </div>
      {showControls && (
        <AnnotationSettingsPane
          event={event}
          showZones={showZones}
          setShowZones={setShowZones}
          annotationOffset={annotationOffset}
          setAnnotationOffset={setAnnotationOffset}
        />
      )}

      <div className="relative flex flex-col items-center justify-center">
        <Carousel className="m-0 w-full" setApi={setMainApi}>
          <CarouselContent>
            {eventSequence.map((item, index) => (
              <CarouselItem key={index}>
                <Card className="p-1 text-sm md:p-2" key={index}>
                  <CardContent className="flex flex-row items-center gap-3 p-1 md:p-2">
                    <div className="flex flex-1 flex-row items-center justify-start p-3 pl-1">
                      <div
                        className="rounded-lg p-2"
                        style={{
                          backgroundColor: "rgb(110,110,110)",
                        }}
                      >
                        <div
                          key={item.data.label}
                          className="relative flex aspect-square size-4 flex-row items-center md:size-8"
                        >
                          {getIconForLabel(
                            item.data.label,
                            "size-4 md:size-6 absolute left-0 top-0",
                          )}
                          <LifecycleIcon
                            className="absolute bottom-0 right-0 size-2 md:size-4"
                            lifecycleItem={item}
                          />
                        </div>
                      </div>
                      <div className="mx-3 text-lg">
                        <div className="flex flex-row items-center capitalize text-primary">
                          {getLifecycleItemDescription(item)}
                        </div>
                        <div className="text-sm text-primary-variant">
                          {formatUnixTimestampToDateTime(item.timestamp, {
                            timezone: config.ui.timezone,
                            strftime_fmt:
                              config.ui.time_format == "24hour"
                                ? "%d %b %H:%M:%S"
                                : "%m/%d %I:%M:%S%P",
                            time_style: "medium",
                            date_style: "medium",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex w-5/12 flex-row items-start justify-start">
                      <div className="text-md mr-2 w-1/3">
                        <div className="flex flex-col items-end justify-start">
                          <p className="mb-1.5 text-sm text-primary-variant">
                            Zones
                          </p>
                          {item.class_type === "entered_zone"
                            ? item.data.zones.map((zone, index) => (
                                <div
                                  key={index}
                                  className="flex flex-row items-center gap-1"
                                >
                                  {true && (
                                    <div
                                      className="size-3 rounded-lg"
                                      style={{
                                        backgroundColor: `rgb(${getZoneColor(zone)})`,
                                      }}
                                    />
                                  )}
                                  <div
                                    key={index}
                                    className="cursor-pointer capitalize"
                                    onClick={() => setSelectedZone(zone)}
                                  >
                                    {zone.replaceAll("_", " ")}
                                  </div>
                                </div>
                              ))
                            : "-"}
                        </div>
                      </div>
                      <div className="text-md mr-2 w-1/3">
                        <div className="flex flex-col items-end justify-start">
                          <p className="mb-1.5 text-sm text-primary-variant">
                            Ratio
                          </p>
                          {Array.isArray(item.data.box) &&
                          item.data.box.length >= 4
                            ? (
                                aspectRatio *
                                (item.data.box[2] / item.data.box[3])
                              ).toFixed(2)
                            : "N/A"}
                        </div>
                      </div>
                      <div className="text-md mr-2 w-1/3">
                        <div className="flex flex-col items-end justify-start">
                          <p className="mb-1.5 text-sm text-primary-variant">
                            Area
                          </p>
                          {Array.isArray(item.data.box) &&
                          item.data.box.length >= 4 ? (
                            <>
                              <div className="flex flex-col text-xs">
                                px:{" "}
                                {Math.round(
                                  detectArea *
                                    (item.data.box[2] * item.data.box[3]),
                                )}
                              </div>
                              <div className="flex flex-col text-xs">
                                %:{" "}
                                {(
                                  (detectArea *
                                    (item.data.box[2] * item.data.box[3])) /
                                  detectArea
                                ).toFixed(4)}
                              </div>
                            </>
                          ) : (
                            "N/A"
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
      <div className="relative mt-4 flex flex-col items-center justify-center">
        <Carousel
          opts={{
            align: "center",
            containScroll: "keepSnaps",
            dragFree: true,
          }}
          className="max-w-[72%] md:max-w-[85%]"
          setApi={setThumbnailApi}
        >
          <CarouselContent
            className={cn(
              "-ml-1 flex select-none flex-row",
              eventSequence.length > 4 ? "justify-start" : "justify-center",
            )}
          >
            {eventSequence.map((item, index) => (
              <CarouselItem
                key={index}
                className={cn("basis-auto cursor-pointer pl-1")}
                onClick={() => handleThumbnailClick(index)}
              >
                <div className="p-1">
                  <Card>
                    <CardContent
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-md p-2",
                        index === current && "bg-selected",
                      )}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <LifecycleIcon
                            className={cn(
                              "size-8",
                              index === current
                                ? "bg-selected text-white"
                                : "text-muted-foreground",
                            )}
                            lifecycleItem={item}
                          />
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipContent className="capitalize">
                            {getLifecycleItemDescription(item)}
                          </TooltipContent>
                        </TooltipPortal>
                      </Tooltip>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            disabled={current === 0}
            onClick={() => handleThumbnailNavigation("previous")}
          />
          <CarouselNext
            disabled={current === eventSequence.length - 1}
            onClick={() => handleThumbnailNavigation("next")}
          />
        </Carousel>
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
      return <LuPlayCircle className={cn(className)} />;
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

function getLifecycleItemDescription(lifecycleItem: ObjectLifecycleSequence) {
  const label = (
    (Array.isArray(lifecycleItem.data.sub_label)
      ? lifecycleItem.data.sub_label[0]
      : lifecycleItem.data.sub_label) || lifecycleItem.data.label
  ).replaceAll("_", " ");

  switch (lifecycleItem.class_type) {
    case "visible":
      return `${label} detected`;
    case "entered_zone":
      return `${label} entered ${lifecycleItem.data.zones
        .join(" and ")
        .replaceAll("_", " ")}`;
    case "active":
      return `${label} became active`;
    case "stationary":
      return `${label} became stationary`;
    case "attribute": {
      let title = "";
      if (
        lifecycleItem.data.attribute == "face" ||
        lifecycleItem.data.attribute == "license_plate"
      ) {
        title = `${lifecycleItem.data.attribute.replaceAll(
          "_",
          " ",
        )} detected for ${label}`;
      } else {
        title = `${
          lifecycleItem.data.label
        } recognized as ${lifecycleItem.data.attribute.replaceAll("_", " ")}`;
      }
      return title;
    }
    case "gone":
      return `${label} left`;
    case "heard":
      return `${label} heard`;
    case "external":
      return `${label} detected`;
  }
}
