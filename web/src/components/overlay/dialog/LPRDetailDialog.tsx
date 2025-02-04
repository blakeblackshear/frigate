import { baseUrl } from "@/api/baseUrl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Event } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { FaDownload, FaImage, FaPlay, FaVideo, FaRegListAlt } from "react-icons/fa";
import { DownloadVideoButton } from "@/components/button/DownloadVideoButton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { isDesktop, isIOS, isMobile, isSafari } from "react-device-detect";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import useImageLoaded from "@/hooks/use-image-loaded";
import ImageLoadingIndicator from "@/components/indicators/ImageLoadingIndicator";
import { GenericVideoPlayer } from "@/components/player/GenericVideoPlayer";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import Chip from "@/components/indicators/Chip";
import {
  MobilePage,
  MobilePageContent,
  MobilePageDescription,
  MobilePageHeader,
  MobilePageTitle,
} from "@/components/mobile/MobilePage";

const LPR_TABS = ["details", "snapshot", "video"] as const;
export type LPRTab = (typeof LPR_TABS)[number];

type LPRDetailDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  event?: Event;
  config: FrigateConfig;
  lprImage: string;
};

export default function LPRDetailDialog({
  open,
  setOpen,
  event,
  config,
  lprImage,
}: LPRDetailDialogProps) {
  const [page, setPage] = useState<LPRTab>("details");

  // content components
  const Overlay = isDesktop ? Dialog : MobilePage;
  const Content = isDesktop ? DialogContent : MobilePageContent;
  const Header = isDesktop ? DialogHeader : MobilePageHeader;
  const Title = isDesktop ? DialogTitle : MobilePageTitle;
  const Description = isDesktop ? DialogDescription : MobilePageDescription;

  const timestamp = useFormattedTimestamp(
    event?.start_time ?? 0,
    config?.ui.time_format == "24hour" ? "%b %-d %Y, %H:%M" : "%b %-d %Y, %I:%M %p",
    config?.ui.timezone,
  );

  const lprTabs = useMemo(() => {
    if (!config || !event) {
      return [];
    }

    const views = [...LPR_TABS];

    if (!event.has_snapshot) {
      const index = views.indexOf("snapshot");
      views.splice(index, 1);
    }

    if (!event.has_clip) {
      const index = views.indexOf("video");
      views.splice(index, 1);
    }

    return views;
  }, [config, event]);

  if (!event) {
    return (
      <Overlay open={open} onOpenChange={setOpen}>
        <Content
          className={cn(
            "scrollbar-container overflow-y-auto",
            isDesktop &&
              "max-h-[95dvh] sm:max-w-xl md:max-w-4xl lg:max-w-4xl xl:max-w-7xl",
            isMobile && "px-4",
          )}
        >
          <Header>
            <Title>License Plate Image</Title>
            <Description className="sr-only">License plate image details</Description>
          </Header>
          <PlateTab lprImage={lprImage} />
        </Content>
      </Overlay>
    );
  }

  return (
    <Overlay open={open} onOpenChange={setOpen}>
      <Content
        className={cn(
          "scrollbar-container overflow-y-auto min-w-[50vw]",
          isDesktop &&
            "max-h-[95dvh] sm:max-w-xl md:max-w-4xl lg:max-w-4xl xl:max-w-7xl",
          isMobile && "px-4",
        )}
      >
        <Header>
          <Title>License Plate Event Details</Title>
          <Description className="sr-only">License plate event details</Description>
        </Header>
        <ScrollArea
          className={cn("w-full whitespace-nowrap", isMobile && "my-2")}
        >
          <div className="flex flex-row">
            <ToggleGroup
              className="*:rounded-md *:px-3 *:py-4"
              type="single"
              size="sm"
              value={page}
              onValueChange={(value: LPRTab) => {
                if (value) {
                  setPage(value);
                }
              }}
            >
              {Object.values(lprTabs).map((item) => (
                <ToggleGroupItem
                  key={item}
                  className={`flex scroll-mx-10 items-center justify-between gap-2 ${page == "details" ? "last:mr-20" : ""} ${page == item ? "" : "*:text-muted-foreground"}`}
                  value={item}
                  data-nav-item={item}
                  aria-label={`Select ${item}`}
                >
                  {item == "details" && <FaRegListAlt className="size-4" />}
                  {item == "snapshot" && <FaImage className="size-4" />}
                  {item == "video" && <FaVideo className="size-4" />}
                  <div className="capitalize">{item}</div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
        {page === "details" && (
          <DetailsTab event={event} timestamp={timestamp} />
        )}
        {page === "snapshot" && (
          <SnapshotTab event={event} />
        )}
        {page === "video" && (
          <VideoTab event={event} />
        )}
        {(page === "details" || !event) && (
          <PlateTab lprImage={lprImage} />
        )}
      </Content>
    </Overlay>
  );
}

type DetailsTabProps = {
  event: Event;
  timestamp: string;
};

function DetailsTab({ event, timestamp }: DetailsTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full flex-row">
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">Camera</div>
            <div className="text-sm capitalize">
              {event.camera.replaceAll("_", " ")}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">Timestamp</div>
            <div className="text-sm">{timestamp}</div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 pl-6">
          <img
            className="aspect-video select-none rounded-lg object-contain transition-opacity"
            style={
              isIOS
                ? {
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                  }
                : undefined
            }
            draggable={false}
            src={`${baseUrl}api/events/${event.id}/thumbnail.jpg`}
          />
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => window.open(`${baseUrl}clips/${event.camera}-${event.id}.mp4`)}
                >
                  <FaPlay className="mr-2 size-4" />
                  Play Recording
                </Button>
              </TooltipTrigger>
              <TooltipContent>Play Recording</TooltipContent>
            </Tooltip>
            <DownloadVideoButton
              source={`${baseUrl}clips/${event.camera}-${event.id}.mp4`}
              camera={event.camera}
              startTime={event.start_time}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => window.open(`${baseUrl}api/events/${event.id}/snapshot.jpg`)}
                >
                  <FaDownload className="mr-2 size-4" />
                  Download Snapshot
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download Snapshot</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

type SnapshotTabProps = {
  event: Event;
};

function SnapshotTab({ event }: SnapshotTabProps) {
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  return (
    <div className="relative size-full">
      <ImageLoadingIndicator
        className="absolute inset-0 aspect-video min-h-[60dvh] w-full"
        imgLoaded={imgLoaded}
      />
      <div className={`${imgLoaded ? "visible" : "invisible"}`}>
        <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
          <div className="flex flex-col space-y-3">
            <TransformComponent
              wrapperStyle={{
                width: "100%",
                height: "100%",
              }}
              contentStyle={{
                position: "relative",
                width: "100%",
                height: "100%",
              }}
            >
              <div className="relative mx-auto">
                <img
                  ref={imgRef}
                  className={`mx-auto max-h-[60dvh] bg-black object-contain`}
                  src={`${baseUrl}api/events/${event.id}/snapshot.jpg`}
                  alt="Event snapshot"
                  loading={isSafari ? "eager" : "lazy"}
                  onLoad={() => {
                    onImgLoad();
                  }}
                />
                <div className={cn("absolute right-1 top-1 flex items-center gap-2")}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a download href={`${baseUrl}api/events/${event.id}/snapshot.jpg`}>
                        <Chip className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500">
                          <FaDownload className="size-4 text-white" />
                        </Chip>
                      </a>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent>Download</TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                </div>
              </div>
            </TransformComponent>
          </div>
        </TransformWrapper>
      </div>
    </div>
  );
}

type VideoTabProps = {
  event: Event;
};

function VideoTab({ event }: VideoTabProps) {
  const endTime = useMemo(() => event.end_time ?? Date.now() / 1000, [event]);
  const source = `${baseUrl}vod/${event.camera}/start/${event.start_time}/end/${endTime}/index.m3u8`;

  return (
    <GenericVideoPlayer source={source}>
      <div className={cn("absolute top-2 z-10 flex items-center gap-2", isIOS ? "right-8" : "right-2")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a download href={`${baseUrl}api/${event.camera}/start/${event.start_time}/end/${endTime}/clip.mp4`}>
              <Chip className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500">
                <FaDownload className="size-4 text-white" />
              </Chip>
            </a>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Download</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </div>
    </GenericVideoPlayer>
  );
}

type PlateTabProps = {
  lprImage: string;
};

function PlateTab({ lprImage }: PlateTabProps) {
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  return (
    <div className="relative size-full">
      <ImageLoadingIndicator
        className="absolute inset-0 aspect-video min-h-[60dvh] w-full"
        imgLoaded={imgLoaded}
      />
      <div className={`${imgLoaded ? "visible" : "invisible"} min-h-[60dvh]`}>
        <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
          <div className="flex flex-col space-y-3">
            <TransformComponent
              wrapperStyle={{
                width: "100%",
                height: "100%",
              }}
              contentStyle={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div className="relative mx-auto w-full h-full flex items-center justify-center">
                <img
                  ref={imgRef}
                  className="mx-auto max-h-[60dvh] w-auto h-auto bg-black object-contain"
                  src={`${baseUrl}clips/lpr/${lprImage}`}
                  alt="License plate"
                  loading={isSafari ? "eager" : "lazy"}
                  onLoad={() => {
                    onImgLoad();
                  }}
                />
                <div className={cn("absolute right-1 top-1 flex items-center gap-2")}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a download href={`${baseUrl}clips/lpr/${lprImage}`}>
                        <Chip className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500">
                          <FaDownload className="size-4 text-white" />
                        </Chip>
                      </a>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent>Download</TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                </div>
              </div>
            </TransformComponent>
          </div>
        </TransformWrapper>
      </div>
    </div>
  );
} 