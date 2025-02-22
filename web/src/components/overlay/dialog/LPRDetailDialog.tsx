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

const LPR_TABS = ["details", "snapshot", "video", "raw"] as const;
export type LPRTab = (typeof LPR_TABS)[number];

type LPRDetailDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  config: FrigateConfig;
  lprImage: string;
  rawImage: string;
};

export default function LPRDetailDialog({
  open,
  setOpen,
  config,
  lprImage,
  rawImage,
}: LPRDetailDialogProps) {
  const [page, setPage] = useState<LPRTab>("details");

  // content components
  const Overlay = isDesktop ? Dialog : MobilePage;
  const Content = isDesktop ? DialogContent : MobilePageContent;
  const Header = isDesktop ? DialogHeader : MobilePageHeader;
  const Title = isDesktop ? DialogTitle : MobilePageTitle;
  const Description = isDesktop ? DialogDescription : MobilePageDescription;

  const lprTabs = useMemo(() => {
    return ['details', 'raw']; // Always show these tabs for LPR debug images
  }, []);

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
        
        <ScrollArea className={cn("w-full whitespace-nowrap", isMobile && "my-2")}>
          <div className="flex flex-row">
            <ToggleGroup
              className="*:rounded-md *:px-3 *:py-4"
              type="single"
              value={page}
              onValueChange={(value: LPRTab) => value && setPage(value)}
            >
              {lprTabs.map((item) => (
                <ToggleGroupItem
                  key={item}
                  className={`flex scroll-mx-10 items-center justify-between gap-2 ${
                    page === item ? "bg-selected" : "bg-muted"
                  }`}
                  value={item}
                >
                  {item === "details" && <FaRegListAlt className="size-4" />}
                  {item === "raw" && <FaImage className="size-4" />}
                  <div className="capitalize">{item}</div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>

        {page === "details" && <PlateTab lprImage={lprImage} config={config} />}
        {page === "raw" && <RawTab rawImage={rawImage} />}
      </Content>
    </Overlay>
  );
}

type PlateTabProps = {
  lprImage: string;
  config: FrigateConfig;
};

function PlateTab({ lprImage, config }: PlateTabProps) {
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();
  const parts = lprImage.split("_");
  const timePart = parts[parts.length - 1].split(".")[0];
  const filenameTimestamp = parseInt(timePart, 10) || 0;

  const timestamp = useFormattedTimestamp(
    filenameTimestamp,
    config?.ui.time_format == "24hour" ? "%Y-%m-%d %H:%M:%S" : "%Y-%m-%d %I:%M:%S %p",
    config?.ui.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  return (
    <div className="relative size-full">
      <ImageLoadingIndicator
        className="absolute inset-0 aspect-video min-h-[60dvh] w-full"
        imgLoaded={imgLoaded}
      />
      <div className={`${imgLoaded ? "visible" : "invisible"} min-h-[60dvh]`}>
        <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
          <div className="flex flex-col space-y-3 h-full">
            <TransformComponent
              wrapperStyle={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                ref={imgRef}
                className="max-h-[70vh] w-auto object-contain bg-black"
                src={`${baseUrl}clips/lpr/${lprImage}`}
                alt="License plate"
                loading={isSafari ? "eager" : "lazy"}
                onLoad={onImgLoad}
              />
            </TransformComponent>
            <div className="absolute left-2 top-2 text-xs text-muted-foreground">
              {timestamp}
            </div>
          </div>
        </TransformWrapper>
      </div>
    </div>
  );
}

type RawTabProps = {
  rawImage: string;
};

function RawTab({ rawImage }: RawTabProps) {
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  return (
    <div className="relative size-full">
      <ImageLoadingIndicator
        className="absolute inset-0 aspect-video min-h-[60dvh] w-full"
        imgLoaded={imgLoaded}
      />
      <div className={`${imgLoaded ? "visible" : "invisible"} min-h-[60dvh]`}>
        <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
          <div className="flex flex-col space-y-3 h-full">
            <TransformComponent
              wrapperStyle={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                ref={imgRef}
                className="max-h-[70vh] w-auto object-contain bg-black"
                src={`${baseUrl}clips/lpr/${rawImage}`}
                alt="Raw license plate"
                loading={isSafari ? "eager" : "lazy"}
                onLoad={onImgLoad}
              />
            </TransformComponent>
          </div>
        </TransformWrapper>
      </div>
    </div>
  );
} 