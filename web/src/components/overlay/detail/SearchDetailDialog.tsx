import { isDesktop, isIOS, isMobile, isSafari } from "react-device-detect";
import { SearchResult } from "@/types/search";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { getIconForLabel } from "@/utils/iconUtil";
import { useApiHost } from "@/api";
import { Button } from "../../ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Event } from "@/types/event";
import { baseUrl } from "@/api/baseUrl";
import { cn } from "@/lib/utils";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import {
  FaCheckCircle,
  FaChevronDown,
  FaHistory,
  FaImage,
  FaRegListAlt,
  FaVideo,
} from "react-icons/fa";
import { FaRotate } from "react-icons/fa6";
import ObjectLifecycle from "./ObjectLifecycle";
import {
  MobilePage,
  MobilePageContent,
  MobilePageDescription,
  MobilePageHeader,
  MobilePageTitle,
} from "@/components/mobile/MobilePage";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReviewSegment } from "@/types/review";
import { useNavigate } from "react-router-dom";
import Chip from "@/components/indicators/Chip";
import { capitalizeAll } from "@/utils/stringUtil";
import useGlobalMutation from "@/hooks/use-global-mutate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Card, CardContent } from "@/components/ui/card";
import useImageLoaded from "@/hooks/use-image-loaded";
import ImageLoadingIndicator from "@/components/indicators/ImageLoadingIndicator";
import { GenericVideoPlayer } from "@/components/player/GenericVideoPlayer";

const SEARCH_TABS = [
  "details",
  "snapshot",
  "video",
  "object lifecycle",
] as const;
export type SearchTab = (typeof SEARCH_TABS)[number];

type SearchDetailDialogProps = {
  search?: SearchResult;
  page: SearchTab;
  setSearch: (search: SearchResult | undefined) => void;
  setSearchPage: (page: SearchTab) => void;
  setSimilarity?: () => void;
};
export default function SearchDetailDialog({
  search,
  page,
  setSearch,
  setSearchPage,
  setSimilarity,
}: SearchDetailDialogProps) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  // tabs

  const [pageToggle, setPageToggle] = useOptimisticState(
    page,
    setSearchPage,
    100,
  );

  // dialog and mobile page

  const [isOpen, setIsOpen] = useState(search != undefined);

  useEffect(() => {
    if (search) {
      setIsOpen(search != undefined);
    }
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

    if (search.data.type != "object") {
      const index = views.indexOf("object lifecycle");
      views.splice(index, 1);
    }

    return views;
  }, [config, search]);

  useEffect(() => {
    if (searchTabs.length == 0) {
      return;
    }

    if (!searchTabs.includes(pageToggle)) {
      setSearchPage("details");
    }
  }, [pageToggle, searchTabs, setSearchPage]);

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
    <Overlay open={isOpen} onOpenChange={() => setIsOpen(!isOpen)}>
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
          <ObjectSnapshotTab
            search={
              {
                ...search,
                plus_id: config?.plus?.enabled ? search.plus_id : "not_enabled",
              } as unknown as Event
            }
            onEventUploaded={() => {
              search.plus_id = "new_upload";
            }}
          />
        )}
        {page == "video" && <VideoTab search={search} />}
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

  // mutation / revalidation

  const mutate = useGlobalMutation();

  // data

  const [desc, setDesc] = useState(search?.data.description);

  // we have to make sure the current selected search item stays in sync
  useEffect(() => setDesc(search?.data.description ?? ""), [search]);

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
        mutate(
          (key) =>
            typeof key === "string" &&
            (key.includes("events") ||
              key.includes("events/search") ||
              key.includes("events/explore")),
        );
      })
      .catch(() => {
        toast.error("Failed to update the description", {
          position: "top-center",
        });
        setDesc(search.data.description);
      });
  }, [desc, search, mutate]);

  const regenerateDescription = useCallback(
    (source: "snapshot" | "thumbnails") => {
      if (!search) {
        return;
      }

      axios
        .put(`events/${search.id}/description/regenerate?source=${source}`)
        .then((resp) => {
          if (resp.status == 200) {
            toast.success(
              `A new description has been requested from ${capitalizeAll(config?.genai.provider.replaceAll("_", " ") ?? "Generative AI")}. Depending on the speed of your provider, the new description may take some time to regenerate.`,
              {
                position: "top-center",
                duration: 7000,
              },
            );
          }
        })
        .catch(() => {
          toast.error(
            `Failed to call ${capitalizeAll(config?.genai.provider.replaceAll("_", " ") ?? "Generative AI")} for a new description`,
            {
              position: "top-center",
            },
          );
        });
    },
    [search, config],
  );

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
          {config?.semantic_search.enabled && (
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
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-sm text-primary/40">Description</div>
        <Textarea
          className="h-64"
          placeholder="Description of the tracked object"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="flex w-full flex-row justify-end gap-2">
          {config?.genai.enabled && (
            <div className="flex items-center">
              <Button
                className="rounded-r-none border-r-0"
                onClick={() => regenerateDescription("thumbnails")}
              >
                Regenerate
              </Button>
              {search.has_snapshot && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="rounded-l-none border-l-0 px-2">
                      <FaChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => regenerateDescription("snapshot")}
                    >
                      Regenerate from Snapshot
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => regenerateDescription("thumbnails")}
                    >
                      Regenerate from Thumbnails
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
          <Button variant="select" onClick={updateDescription}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

type ObjectSnapshotTabProps = {
  search: Event;
  onEventUploaded: () => void;
};
function ObjectSnapshotTab({
  search,
  onEventUploaded,
}: ObjectSnapshotTabProps) {
  type SubmissionState = "reviewing" | "uploading" | "submitted";

  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  // upload

  const [state, setState] = useState<SubmissionState>(
    search?.plus_id ? "submitted" : "reviewing",
  );

  useEffect(
    () => setState(search?.plus_id ? "submitted" : "reviewing"),
    [search],
  );

  const onSubmitToPlus = useCallback(
    async (falsePositive: boolean) => {
      if (!search) {
        return;
      }

      falsePositive
        ? axios.put(`events/${search.id}/false_positive`)
        : axios.post(`events/${search.id}/plus`, {
            include_annotation: 1,
          });

      setState("submitted");
      onEventUploaded();
    },
    [search, onEventUploaded],
  );

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
              {search?.id && (
                <img
                  ref={imgRef}
                  className={`mx-auto max-h-[60dvh] bg-black object-contain`}
                  src={`${baseUrl}api/events/${search?.id}/snapshot.jpg`}
                  alt={`${search?.label}`}
                  loading={isSafari ? "eager" : "lazy"}
                  onLoad={() => {
                    onImgLoad();
                  }}
                />
              )}
            </TransformComponent>
            {search.plus_id !== "not_enabled" && search.end_time && (
              <Card className="p-1 text-sm md:p-2">
                <CardContent className="flex flex-col items-center justify-between gap-3 p-2 md:flex-row">
                  <div className={cn("flex flex-col space-y-3")}>
                    <div
                      className={
                        "text-lg font-semibold leading-none tracking-tight"
                      }
                    >
                      Submit To Frigate+
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Objects in locations you want to avoid are not false
                      positives. Submitting them as false positives will confuse
                      the model.
                    </div>
                  </div>

                  <div className="flex flex-row justify-center gap-2 md:justify-end">
                    {state == "reviewing" && (
                      <>
                        <Button
                          className="bg-success"
                          onClick={() => {
                            setState("uploading");
                            onSubmitToPlus(false);
                          }}
                        >
                          This is a {search?.label}
                        </Button>
                        <Button
                          className="text-white"
                          variant="destructive"
                          onClick={() => {
                            setState("uploading");
                            onSubmitToPlus(true);
                          }}
                        >
                          This is not a {search?.label}
                        </Button>
                      </>
                    )}
                    {state == "uploading" && <ActivityIndicator />}
                    {state == "submitted" && (
                      <div className="flex flex-row items-center justify-center gap-2">
                        <FaCheckCircle className="text-success" />
                        Submitted
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TransformWrapper>
      </div>
    </div>
  );
}

type VideoTabProps = {
  search: SearchResult;
};

export function VideoTab({ search }: VideoTabProps) {
  const navigate = useNavigate();
  const { data: reviewItem } = useSWR<ReviewSegment>([
    `review/event/${search.id}`,
  ]);
  const endTime = useMemo(() => search.end_time ?? Date.now() / 1000, [search]);

  const source = `${baseUrl}vod/${search.camera}/start/${search.start_time}/end/${endTime}/index.m3u8`;

  return (
    <GenericVideoPlayer source={source}>
      {reviewItem && (
        <div
          className={cn(
            "absolute top-2 z-10 flex items-center",
            isIOS ? "right-8" : "right-2",
          )}
        >
          <Tooltip>
            <TooltipTrigger>
              <Chip
                className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500"
                onClick={() => {
                  if (reviewItem?.id) {
                    const params = new URLSearchParams({
                      id: reviewItem.id,
                    }).toString();
                    navigate(`/review?${params}`);
                  }
                }}
              >
                <FaHistory className="size-4 text-white" />
              </Chip>
            </TooltipTrigger>
            <TooltipContent side="left">View in History</TooltipContent>
          </Tooltip>
        </div>
      )}
    </GenericVideoPlayer>
  );
}
