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
  FaArrowRight,
  FaCheckCircle,
  FaChevronDown,
  FaDownload,
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Card, CardContent } from "@/components/ui/card";
import useImageLoaded from "@/hooks/use-image-loaded";
import ImageLoadingIndicator from "@/components/indicators/ImageLoadingIndicator";
import { GenericVideoPlayer } from "@/components/player/GenericVideoPlayer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LuInfo, LuSearch } from "react-icons/lu";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { FaPencilAlt } from "react-icons/fa";
import TextEntryDialog from "@/components/overlay/dialog/TextEntryDialog";
import { useTranslation } from "react-i18next";
import { TbFaceId } from "react-icons/tb";

const SEARCH_TABS = [
  "details",
  "snapshot",
  "video",
  "object_lifecycle",
] as const;
export type SearchTab = (typeof SEARCH_TABS)[number];

type SearchDetailDialogProps = {
  search?: SearchResult;
  page: SearchTab;
  setSearch: (search: SearchResult | undefined) => void;
  setSearchPage: (page: SearchTab) => void;
  setSimilarity?: () => void;
  setInputFocused: React.Dispatch<React.SetStateAction<boolean>>;
};
export default function SearchDetailDialog({
  search,
  page,
  setSearch,
  setSearchPage,
  setSimilarity,
  setInputFocused,
}: SearchDetailDialogProps) {
  const { t } = useTranslation(["views/explore", "views/faceLibrary"]);
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

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        // short timeout to allow the mobile page animation
        // to complete before updating the state
        setTimeout(() => {
          setSearch(undefined);
        }, 300);
      }
    },
    [setSearch],
  );

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

    if (!search.has_clip) {
      const index = views.indexOf("video");
      views.splice(index, 1);
    }

    if (search.data.type != "object" || !search.has_clip) {
      const index = views.indexOf("object_lifecycle");
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
    <Overlay open={isOpen} onOpenChange={handleOpenChange}>
      <Content
        className={cn(
          "scrollbar-container overflow-y-auto",
          isDesktop &&
            "max-h-[95dvh] sm:max-w-xl md:max-w-4xl lg:max-w-4xl xl:max-w-7xl",
          isMobile && "px-4",
        )}
      >
        <Header>
          <Title>{t("trackedObjectDetails")}</Title>
          <Description className="sr-only">
            {t("trackedObjectDetails")}
          </Description>
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
                  {item == "object_lifecycle" && (
                    <FaRotate className="size-4" />
                  )}
                  <div className="capitalize">{t(`type.${item}`)}</div>
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
            setInputFocused={setInputFocused}
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
        {page == "object_lifecycle" && (
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
  setInputFocused: React.Dispatch<React.SetStateAction<boolean>>;
};
function ObjectDetailsTab({
  search,
  config,
  setSearch,
  setSimilarity,
  setInputFocused,
}: ObjectDetailsTabProps) {
  const { t } = useTranslation(["views/explore"]);

  const apiHost = useApiHost();

  // mutation / revalidation

  const mutate = useGlobalMutation();

  // data

  const [desc, setDesc] = useState(search?.data.description);
  const [isSubLabelDialogOpen, setIsSubLabelDialogOpen] = useState(false);

  const handleDescriptionFocus = useCallback(() => {
    setInputFocused(true);
  }, [setInputFocused]);

  const handleDescriptionBlur = useCallback(() => {
    setInputFocused(false);
  }, [setInputFocused]);

  // we have to make sure the current selected search item stays in sync
  useEffect(() => setDesc(search?.data.description ?? ""), [search]);

  const formattedDate = useFormattedTimestamp(
    search?.start_time ?? 0,
    config?.ui.time_format == "24hour"
      ? t("time.formattedTimestampWithYear.24hour", { ns: "common" })
      : t("time.formattedTimestampWithYear.12hour", { ns: "common" }),
    config?.ui.timezone,
  );

  const score = useMemo(() => {
    if (!search) {
      return 0;
    }

    const value = search.data.top_score ?? search.top_score ?? 0;

    return Math.round(value * 100);
  }, [search]);

  const subLabelScore = useMemo(() => {
    if (!search) {
      return undefined;
    }

    if (search.sub_label && search.data?.sub_label_score) {
      return Math.round((search.data?.sub_label_score ?? 0) * 100);
    } else {
      return undefined;
    }
  }, [search]);

  const recognizedLicensePlateScore = useMemo(() => {
    if (!search) {
      return undefined;
    }

    if (
      search.data.recognized_license_plate &&
      search.data?.recognized_license_plate_score
    ) {
      return Math.round(
        (search.data?.recognized_license_plate_score ?? 0) * 100,
      );
    } else {
      return undefined;
    }
  }, [search]);

  const averageEstimatedSpeed = useMemo(() => {
    if (!search || !search.data?.average_estimated_speed) {
      return undefined;
    }

    if (search.data?.average_estimated_speed != 0) {
      return search.data?.average_estimated_speed.toFixed(1);
    } else {
      return undefined;
    }
  }, [search]);

  const velocityAngle = useMemo(() => {
    if (!search || !search.data?.velocity_angle) {
      return undefined;
    }

    if (search.data?.velocity_angle != 0) {
      return search.data?.velocity_angle.toFixed(1);
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
          toast.success(t("details.tips.descriptionSaved"), {
            position: "top-center",
          });
        }
        mutate(
          (key) =>
            typeof key === "string" &&
            (key.includes("events") ||
              key.includes("events/search") ||
              key.includes("events/explore")),
          (currentData: SearchResult[][] | SearchResult[] | undefined) => {
            if (!currentData) return currentData;
            // optimistic update
            return currentData
              .flat()
              .map((event) =>
                event.id === search.id
                  ? { ...event, data: { ...event.data, description: desc } }
                  : event,
              );
          },
          {
            optimisticData: true,
            rollbackOnError: true,
            revalidate: false,
          },
        );
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("details.tips.saveDescriptionFailed", {
            errorMessage,
          }),
          {
            position: "top-center",
          },
        );
        setDesc(search.data.description);
      });
  }, [desc, search, mutate, t]);

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
              t("details.item.toast.success.regenerate", {
                provider: capitalizeAll(
                  config?.genai.provider.replaceAll("_", " ") ??
                    t("generativeAI"),
                ),
              }),
              {
                position: "top-center",
                duration: 7000,
              },
            );
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("details.item.toast.error.regenerate", {
              provider: capitalizeAll(
                config?.genai.provider.replaceAll("_", " ") ??
                  t("generativeAI"),
              ),
              errorMessage,
            }),
            { position: "top-center" },
          );
        });
    },
    [search, config, t],
  );

  const handleSubLabelSave = useCallback(
    (text: string) => {
      if (!search) return;

      // set score to 1.0 if we're manually entering a sub label
      const subLabelScore =
        text === "" ? undefined : search.data?.sub_label_score || 1.0;

      axios
        .post(`${apiHost}api/events/${search.id}/sub_label`, {
          camera: search.camera,
          subLabel: text,
          subLabelScore: subLabelScore,
        })
        .then((response) => {
          if (response.status === 200) {
            toast.success(t("details.item.toast.success.updatedSublabel"), {
              position: "top-center",
            });

            mutate(
              (key) =>
                typeof key === "string" &&
                (key.includes("events") ||
                  key.includes("events/search") ||
                  key.includes("events/explore")),
              (currentData: SearchResult[][] | SearchResult[] | undefined) => {
                if (!currentData) return currentData;
                return currentData.flat().map((event) =>
                  event.id === search.id
                    ? {
                        ...event,
                        sub_label: text,
                        data: {
                          ...event.data,
                          sub_label_score: subLabelScore,
                        },
                      }
                    : event,
                );
              },
              {
                optimisticData: true,
                rollbackOnError: true,
                revalidate: false,
              },
            );

            setSearch({
              ...search,
              sub_label: text,
              data: {
                ...search.data,
                sub_label_score: subLabelScore,
              },
            });
            setIsSubLabelDialogOpen(false);
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("details.item.toast.error.updatedSublabelFailed", {
              errorMessage,
            }),
            {
              position: "top-center",
            },
          );
        });
    },
    [search, apiHost, mutate, setSearch, t],
  );

  // face training

  const hasFace = useMemo(() => {
    if (!config?.face_recognition.enabled || !search) {
      return false;
    }

    return search.data.attributes?.find((attr) => attr.label == "face");
  }, [config, search]);

  const { data: faceData } = useSWR(hasFace ? "faces" : null);

  const faceNames = useMemo<string[]>(
    () =>
      faceData ? Object.keys(faceData).filter((face) => face != "train") : [],
    [faceData],
  );

  const onTrainFace = useCallback(
    (trainName: string) => {
      axios
        .post(`/faces/train/${trainName}/classify`, { event_id: search.id })
        .then((resp) => {
          if (resp.status == 200) {
            toast.success(t("toast.success.trainedFace"), {
              position: "top-center",
            });
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(t("toast.error.trainFailed", { errorMessage }), {
            position: "top-center",
          });
        });
    },
    [search, t],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full flex-row">
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">{t("details.label")}</div>
            <div className="flex flex-row items-center gap-2 text-sm capitalize">
              {getIconForLabel(search.label, "size-4 text-primary")}
              {t(search.label, { ns: "objects" })}
              {search.sub_label && ` (${search.sub_label})`}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <FaPencilAlt
                      className="size-4 cursor-pointer text-primary/40 hover:text-primary/80"
                      onClick={() => {
                        setIsSubLabelDialogOpen(true);
                      }}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent>
                    {t("details.editSubLabel.title")}
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            </div>
          </div>
          {search?.data.recognized_license_plate && (
            <div className="flex flex-col gap-1.5">
              <div className="text-sm text-primary/40">
                Recognized License Plate
              </div>
              <div className="flex flex-col space-y-0.5 text-sm">
                <div className="flex flex-row items-center gap-2">
                  {search.data.recognized_license_plate}{" "}
                  {recognizedLicensePlateScore &&
                    ` (${recognizedLicensePlateScore}%)`}
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">
              <div className="flex flex-row items-center gap-1">
                {t("details.topScore.label")}
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="cursor-pointer p-0">
                      <LuInfo className="size-4" />
                      <span className="sr-only">Info</span>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    {t("details.topScore.info")}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="text-sm">
              {score}%{subLabelScore && ` (${subLabelScore}%)`}
            </div>
          </div>
          {averageEstimatedSpeed && (
            <div className="flex flex-col gap-1.5">
              <div className="text-sm text-primary/40">
                {t("details.estimatedSpeed")}
              </div>
              <div className="flex flex-col space-y-0.5 text-sm">
                {averageEstimatedSpeed && (
                  <div className="flex flex-row items-center gap-2">
                    {averageEstimatedSpeed}{" "}
                    {config?.ui.unit_system == "imperial"
                      ? t("unit.speed.mph", { ns: "common" })
                      : t("unit.speed.kph", { ns: "common" })}{" "}
                    {velocityAngle != undefined && (
                      <span className="text-primary/40">
                        <FaArrowRight
                          size={10}
                          style={{
                            transform: `rotate(${(360 - Number(velocityAngle)) % 360}deg)`,
                          }}
                        />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">{t("details.camera")}</div>
            <div className="text-sm capitalize">
              {search.camera.replaceAll("_", " ")}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">
              {t("details.timestamp")}
            </div>
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
            src={`${apiHost}api/events/${search.id}/thumbnail.webp`}
          />
          <div
            className={cn("flex w-full flex-row gap-2", isMobile && "flex-col")}
          >
            {config?.semantic_search.enabled &&
              search.data.type == "object" && (
                <Button
                  className="w-full"
                  aria-label={t("itemMenu.findSimilar.aria")}
                  onClick={() => {
                    setSearch(undefined);

                    if (setSimilarity) {
                      setSimilarity();
                    }
                  }}
                >
                  <div className="flex gap-1">
                    <LuSearch />
                    {t("itemMenu.findSimilar.label")}
                  </div>
                </Button>
              )}
            {hasFace && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full">
                    <div className="flex gap-1">
                      <TbFaceId />
                      {t("trainFace", { ns: "views/faceLibrary" })}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>
                    {t("trainFaceAs", { ns: "views/faceLibrary" })}
                  </DropdownMenuLabel>
                  {faceNames.map((faceName) => (
                    <DropdownMenuItem
                      key={faceName}
                      className="cursor-pointer capitalize"
                      onClick={() => onTrainFace(faceName)}
                    >
                      {faceName}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {config?.cameras[search.camera].genai.enabled &&
        !search.end_time &&
        (config.cameras[search.camera].genai.required_zones.length === 0 ||
          search.zones.some((zone) =>
            config.cameras[search.camera].genai.required_zones.includes(zone),
          )) &&
        (config.cameras[search.camera].genai.objects.length === 0 ||
          config.cameras[search.camera].genai.objects.includes(
            search.label,
          )) ? (
          <>
            <div className="text-sm text-primary/40">Description</div>
            <div className="flex h-64 flex-col items-center justify-center gap-3 border p-4 text-sm text-primary/40">
              <div className="flex">
                <ActivityIndicator />
              </div>
              <div className="flex">{t("details.description.aiTips")}</div>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-primary/40"></div>
            <Textarea
              className="h-64"
              placeholder={t("details.description.placeholder")}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onFocus={handleDescriptionFocus}
              onBlur={handleDescriptionBlur}
            />
          </>
        )}

        <div className="flex w-full flex-row justify-end gap-2">
          {config?.cameras[search.camera].genai.enabled && search.end_time && (
            <div className="flex items-start">
              <Button
                className="rounded-r-none border-r-0"
                aria-label={t("details.button.regenerate.label")}
                onClick={() => regenerateDescription("thumbnails")}
              >
                {t("details.button.regenerate.title")}
              </Button>
              {search.has_snapshot && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="rounded-l-none border-l-0 px-2"
                      aria-label={t("details.expandRegenerationMenu")}
                    >
                      <FaChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      aria-label={t("details.regenerateFromSnapshot")}
                      onClick={() => regenerateDescription("snapshot")}
                    >
                      {t("details.regenerateFromSnapshot")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      aria-label={t("details.regenerateFromThumbnails")}
                      onClick={() => regenerateDescription("thumbnails")}
                    >
                      {t("details.regenerateFromThumbnails")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
          {((config?.cameras[search.camera].genai.enabled && search.end_time) ||
            !config?.cameras[search.camera].genai.enabled) && (
            <Button
              variant="select"
              aria-label={t("button.save", { ns: "common" })}
              onClick={updateDescription}
            >
              {t("button.save", { ns: "common" })}
            </Button>
          )}
          <TextEntryDialog
            open={isSubLabelDialogOpen}
            setOpen={setIsSubLabelDialogOpen}
            title={t("details.editSubLabel.title")}
            description={
              search.label
                ? t("details.editSubLabel.desc", {
                    label: t(search.label, { an: "objects" }),
                  })
                : t("details.editSubLabel.descNoLabel")
            }
            onSave={handleSubLabelSave}
            defaultValue={search?.sub_label || ""}
            allowEmpty={true}
          />
        </div>
      </div>
    </div>
  );
}

type ObjectSnapshotTabProps = {
  search: Event;
  onEventUploaded: () => void;
};
export function ObjectSnapshotTab({
  search,
  onEventUploaded,
}: ObjectSnapshotTabProps) {
  const { t } = useTranslation(["components/dialog"]);
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
                <div className="relative mx-auto">
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
                  <div
                    className={cn(
                      "absolute right-1 top-1 flex items-center gap-2",
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          download
                          href={`${baseUrl}api/events/${search?.id}/snapshot.jpg`}
                        >
                          <Chip className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500">
                            <FaDownload className="size-4 text-white" />
                          </Chip>
                        </a>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent>
                          {t("button.download", { ns: "common" })}
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  </div>
                </div>
              )}
            </TransformComponent>
            {search.data.type == "object" &&
              search.plus_id !== "not_enabled" &&
              search.end_time &&
              search.label != "on_demand" && (
                <Card className="p-1 text-sm md:p-2">
                  <CardContent className="flex flex-col items-center justify-between gap-3 p-2 md:flex-row">
                    <div className={cn("flex flex-col space-y-3")}>
                      <div
                        className={
                          "text-lg font-semibold leading-none tracking-tight"
                        }
                      >
                        {t("explore.plus.submitToPlus.label")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("explore.plus.submitToPlus.desc")}
                      </div>
                    </div>

                    <div className="flex flex-row justify-center gap-2 md:justify-end">
                      {state == "reviewing" && (
                        <>
                          <Button
                            className="bg-success"
                            aria-label={t("explore.plus.review.true.label")}
                            onClick={() => {
                              setState("uploading");
                              onSubmitToPlus(false);
                            }}
                          >
                            {/^[aeiou]/i.test(search?.label || "")
                              ? t("explore.plus.review.true.true_other", {
                                  label: search?.label,
                                })
                              : t("explore.plus.review.true.true_one", {
                                  label: search?.label,
                                })}
                          </Button>
                          <Button
                            className="text-white"
                            aria-label={t("explore.plus.review.false.label")}
                            variant="destructive"
                            onClick={() => {
                              setState("uploading");
                              onSubmitToPlus(true);
                            }}
                          >
                            {/^[aeiou]/i.test(search?.label || "")
                              ? t("explore.plus.review.false.false_other", {
                                  label: search?.label,
                                })
                              : t("explore.plus.review.false.false_one", {
                                  label: search?.label,
                                })}
                          </Button>
                        </>
                      )}
                      {state == "uploading" && <ActivityIndicator />}
                      {state == "submitted" && (
                        <div className="flex flex-row items-center justify-center gap-2">
                          <FaCheckCircle className="text-success" />
                          {t("explore.plus.review.state.submitted")}
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
  const { t } = useTranslation(["views/explore"]);
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
            "absolute top-2 z-10 flex items-center gap-2",
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
            <TooltipPortal>
              <TooltipContent>
                {t("itemMenu.viewInHistory.label")}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                download
                href={`${baseUrl}api/${search.camera}/start/${search.start_time}/end/${endTime}/clip.mp4`}
              >
                <Chip className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500">
                  <FaDownload className="size-4 text-white" />
                </Chip>
              </a>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>
                {t("button.download", { ns: "common" })}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
      )}
    </GenericVideoPlayer>
  );
}
