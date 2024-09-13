import { isDesktop, isIOS, isMobile } from "react-device-detect";
import { SearchResult } from "@/types/search";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { getIconForLabel } from "@/utils/iconUtil";
import { useApiHost } from "@/api";
import { Button } from "../../ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Textarea } from "../../ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import useOptimisticState from "@/hooks/use-optimistic-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FrigatePlusDialog } from "../dialog/FrigatePlusDialog";
import { Event } from "@/types/event";
import HlsVideoPlayer from "@/components/player/HlsVideoPlayer";
import { baseUrl } from "@/api/baseUrl";
import { cn } from "@/lib/utils";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { ASPECT_VERTICAL_LAYOUT, ASPECT_WIDE_LAYOUT } from "@/types/record";
import { FaImage, FaRegListAlt, FaVideo } from "react-icons/fa";
import { FaRotate } from "react-icons/fa6";
import ObjectLifecycle from "./ObjectLifecycle";
import {
  MobilePage,
  MobilePageContent,
  MobilePageDescription,
  MobilePageHeader,
  MobilePageTitle,
} from "@/components/mobile/MobilePage";

const SEARCH_TABS = [
  "details",
  "snapshot",
  "video",
  "object lifecycle",
] as const;
type SearchTab = (typeof SEARCH_TABS)[number];

type SearchDetailDialogProps = {
  search?: SearchResult;
  setSearch: (search: SearchResult | undefined) => void;
  setSimilarity?: () => void;
};
export default function SearchDetailDialog({
  search,
  setSearch,
  setSimilarity,
}: SearchDetailDialogProps) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  // tabs

  const [page, setPage] = useState<SearchTab>("details");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);

  // dialog and mobile page

  const [isOpen, setIsOpen] = useState(search != undefined);

  useEffect(() => {
    setIsOpen(search != undefined);
  }, [search]);

  const searchTabs = useMemo(() => {
    if (!config || !search) {
      return [];
    }

    const views = [...SEARCH_TABS];

    if (!search.has_snapshot) {
      const index = views.indexOf("snapshot");
      views.splice(index, 1);
    }

    // TODO implement
    //if (!config.semantic_search.enabled) {
    //  const index = views.indexOf("similar-calendar");
    //  views.splice(index, 1);
    // }

    return views;
  }, [config, search]);

  useEffect(() => {
    if (searchTabs.length == 0) {
      return;
    }

    if (!searchTabs.includes(pageToggle)) {
      setPage("details");
    }
  }, [pageToggle, searchTabs]);

  if (!search) {
    return;
  }

  // content

  const Overlay = isDesktop ? Dialog : MobilePage;
  const Content = isDesktop ? DialogContent : MobilePageContent;
  const Header = isDesktop ? DialogHeader : MobilePageHeader;
  const Title = isDesktop ? DialogTitle : MobilePageTitle;
  const Description = isDesktop ? DialogDescription : MobilePageDescription;

  return (
    <Overlay
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setSearch(undefined);
        }
      }}
    >
      <Content
        className={cn(
          "scrollbar-container overflow-y-auto",
          isDesktop &&
            "max-h-[95dvh] sm:max-w-xl md:max-w-4xl lg:max-w-4xl xl:max-w-7xl",
          isMobile && "px-4",
        )}
      >
        <Header onClose={() => setIsOpen(false)}>
          <Title>Tracked Object Details</Title>
          <Description className="sr-only">Tracked object details</Description>
        </Header>
        <ScrollArea
          className={cn("w-full whitespace-nowrap", isMobile && "my-2")}
        >
          <div className="flex flex-row">
            <ToggleGroup
              className="*:rounded-md *:px-3 *:py-4"
              type="single"
              size="sm"
              value={pageToggle}
              onValueChange={(value: SearchTab) => {
                if (value) {
                  setPageToggle(value);
                }
              }}
            >
              {Object.values(searchTabs).map((item) => (
                <ToggleGroupItem
                  key={item}
                  className={`flex scroll-mx-10 items-center justify-between gap-2 ${page == "details" ? "last:mr-20" : ""} ${pageToggle == item ? "" : "*:text-muted-foreground"}`}
                  value={item}
                  data-nav-item={item}
                  aria-label={`Select ${item}`}
                >
                  {item == "details" && <FaRegListAlt className="size-4" />}
                  {item == "snapshot" && <FaImage className="size-4" />}
                  {item == "video" && <FaVideo className="size-4" />}
                  {item == "object lifecycle" && (
                    <FaRotate className="size-4" />
                  )}
                  <div className="capitalize">{item}</div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
        {page == "details" && (
          <ObjectDetailsTab
            search={search}
            config={config}
            setSearch={setSearch}
            setSimilarity={setSimilarity}
          />
        )}
        {page == "snapshot" && (
          <FrigatePlusDialog
            upload={
              {
                ...search,
                plus_id: config?.plus?.enabled ? search.plus_id : "not_enabled",
              } as unknown as Event
            }
            dialog={false}
            onClose={() => {}}
            onEventUploaded={() => {
              search.plus_id = "new_upload";
            }}
          />
        )}
        {page == "video" && <VideoTab search={search} config={config} />}
        {page == "object lifecycle" && (
          <ObjectLifecycle
            className="w-full overflow-x-hidden"
            event={search as unknown as Event}
            fullscreen={true}
            setPane={() => {}}
          />
        )}
      </Content>
    </Overlay>
  );
}

type ObjectDetailsTabProps = {
  search: SearchResult;
  config?: FrigateConfig;
  setSearch: (search: SearchResult | undefined) => void;
  setSimilarity?: () => void;
};
function ObjectDetailsTab({
  search,
  config,
  setSearch,
  setSimilarity,
}: ObjectDetailsTabProps) {
  const apiHost = useApiHost();

  // data

  const [desc, setDesc] = useState(search?.description);

  // we have to make sure the current selected search item stays in sync
  useEffect(() => setDesc(search?.description), [search]);

  const formattedDate = useFormattedTimestamp(
    search?.start_time ?? 0,
    config?.ui.time_format == "24hour"
      ? "%b %-d %Y, %H:%M"
      : "%b %-d %Y, %I:%M %p",
    config?.ui.timezone,
  );

  const score = useMemo(() => {
    if (!search) {
      return 0;
    }

    const value = search.score ?? search.data.top_score;

    return Math.round(value * 100);
  }, [search]);

  const subLabelScore = useMemo(() => {
    if (!search) {
      return undefined;
    }

    if (search.sub_label) {
      return Math.round((search.data?.top_score ?? 0) * 100);
    } else {
      return undefined;
    }
  }, [search]);

  const updateDescription = useCallback(() => {
    if (!search) {
      return;
    }

    axios
      .post(`events/${search.id}/description`, { description: desc })
      .then((resp) => {
        if (resp.status == 200) {
          toast.success("Successfully saved description", {
            position: "top-center",
          });
        }
      })
      .catch(() => {
        toast.error("Failed to update the description", {
          position: "top-center",
        });
        setDesc(search.description);
      });
  }, [desc, search]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full flex-row">
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">Label</div>
            <div className="flex flex-row items-center gap-2 text-sm capitalize">
              {getIconForLabel(search.label, "size-4 text-primary")}
              {search.label}
              {search.sub_label && ` (${search.sub_label})`}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">Score</div>
            <div className="text-sm">
              {score}%{subLabelScore && ` (${subLabelScore}%)`}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">Camera</div>
            <div className="text-sm capitalize">
              {search.camera.replaceAll("_", " ")}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">Timestamp</div>
            <div className="text-sm">{formattedDate}</div>
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
            src={`${apiHost}api/events/${search.id}/thumbnail.jpg`}
          />
          <Button
            onClick={() => {
              setSearch(undefined);

              if (setSimilarity) {
                setSimilarity();
              }
            }}
          >
            Find Similar
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-sm text-primary/40">Description</div>
        <Textarea
          className="md:h-64"
          placeholder="Description of the event"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="flex w-full flex-row justify-end">
          <Button variant="select" onClick={updateDescription}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

type VideoTabProps = {
  search: SearchResult;
  config?: FrigateConfig;
};
function VideoTab({ search, config }: VideoTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const endTime = useMemo(() => search.end_time ?? Date.now() / 1000, [search]);

  const mainCameraAspect = useMemo(() => {
    const camera = config?.cameras?.[search.camera];

    if (!camera) {
      return "normal";
    }

    const aspectRatio = camera.detect.width / camera.detect.height;

    if (!aspectRatio) {
      return "normal";
    } else if (aspectRatio > ASPECT_WIDE_LAYOUT) {
      return "wide";
    } else if (aspectRatio < ASPECT_VERTICAL_LAYOUT) {
      return "tall";
    } else {
      return "normal";
    }
  }, [config, search]);

  const containerClassName = useMemo(() => {
    if (mainCameraAspect == "wide") {
      return "flex justify-center items-center";
    } else if (mainCameraAspect == "tall") {
      if (isDesktop) {
        return "size-full flex flex-col justify-center items-center";
      } else {
        return "size-full";
      }
    } else {
      return "";
    }
  }, [mainCameraAspect]);

  const videoClassName = useMemo(() => {
    if (mainCameraAspect == "wide") {
      return "w-full aspect-wide";
    } else if (mainCameraAspect == "tall") {
      if (isDesktop) {
        return "w-[50%] aspect-tall flex justify-center";
      } else {
        return "size-full";
      }
    } else {
      return "w-full aspect-video";
    }
  }, [mainCameraAspect]);

  return (
    <div className={`aspect-video ${containerClassName}`}>
      {isLoading && (
        <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      )}
      <div className={videoClassName}>
        <HlsVideoPlayer
          videoRef={videoRef}
          currentSource={`${baseUrl}vod/${search.camera}/start/${search.start_time}/end/${endTime}/index.m3u8`}
          hotKeys
          visible
          frigateControls={false}
          fullscreen={false}
          supportsFullscreen={false}
          onPlaying={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
