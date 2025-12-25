import { isDesktop, isIOS, isMobile, isSafari } from "react-device-detect";
import { SearchResult } from "@/types/search";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { getIconForLabel } from "@/utils/iconUtil";
import { useApiHost } from "@/api";
import { Button } from "../../ui/button";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  FaChevronLeft,
  FaChevronRight,
  FaMicrophone,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { TrackingDetails } from "./TrackingDetails";
import { AnnotationSettingsPane } from "./AnnotationSettingsPane";
import { DetailStreamProvider } from "@/context/detail-stream-context";
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
import { REVIEW_PADDING } from "@/types/review";
import { capitalizeAll } from "@/utils/stringUtil";
import useGlobalMutation from "@/hooks/use-global-mutate";
import DetailActionsMenu from "./DetailActionsMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import useImageLoaded from "@/hooks/use-image-loaded";
import ImageLoadingIndicator from "@/components/indicators/ImageLoadingIndicator";
import { GenericVideoPlayer } from "@/components/player/GenericVideoPlayer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { LuInfo } from "react-icons/lu";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { FaPencilAlt } from "react-icons/fa";
import TextEntryDialog from "@/components/overlay/dialog/TextEntryDialog";
import AttributeSelectDialog from "@/components/overlay/dialog/AttributeSelectDialog";
import { Trans, useTranslation } from "react-i18next";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { getTranslatedLabel } from "@/utils/i18n";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { DialogPortal } from "@radix-ui/react-dialog";
import { useDetailStream } from "@/context/detail-stream-context";
import { PiSlidersHorizontalBold } from "react-icons/pi";
import { HiSparkles } from "react-icons/hi";
import { useAudioTranscriptionProcessState } from "@/api/ws";

const SEARCH_TABS = ["snapshot", "tracking_details"] as const;
export type SearchTab = (typeof SEARCH_TABS)[number];

type TabsWithActionsProps = {
  search: SearchResult;
  searchTabs: SearchTab[];
  pageToggle: SearchTab;
  setPageToggle: (v: SearchTab) => void;
  config?: FrigateConfig;
  setSearch: (s: SearchResult | undefined) => void;
  setSimilarity?: () => void;
  isPopoverOpen: boolean;
  setIsPopoverOpen: (open: boolean) => void;
  dialogContainer: HTMLDivElement | null;
};

function TabsWithActions({
  search,
  searchTabs,
  pageToggle,
  setPageToggle,
  config,
  setSearch,
  setSimilarity,
  isPopoverOpen,
  setIsPopoverOpen,
  dialogContainer,
}: TabsWithActionsProps) {
  const { t } = useTranslation(["views/explore", "views/faceLibrary"]);

  useEffect(() => {
    if (pageToggle !== "tracking_details" && isPopoverOpen) {
      setIsPopoverOpen(false);
    }
  }, [pageToggle, isPopoverOpen, setIsPopoverOpen]);

  if (!search) return null;

  return (
    <div className="flex items-center justify-between gap-1">
      <ScrollArea className="flex-1 whitespace-nowrap">
        <div className="mb-2 flex flex-row">
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
                className="flex scroll-mx-10 items-center justify-between gap-2 text-muted-foreground"
                value={item}
                data-nav-item={item}
                aria-label={`Select ${item}`}
              >
                <div className="smart-capitalize">
                  {item === "snapshot"
                    ? search?.has_snapshot
                      ? t("type.snapshot")
                      : t("type.thumbnail")
                    : t(`type.${item}`)}
                </div>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ScrollBar orientation="horizontal" className="h-0" />
        </div>
      </ScrollArea>
      <DetailActionsMenu
        search={search}
        config={config}
        setSearch={setSearch}
        setSimilarity={setSimilarity}
      />
      {pageToggle === "tracking_details" && (
        <AnnotationSettings
          search={search}
          open={isPopoverOpen}
          setIsOpen={setIsPopoverOpen}
          container={dialogContainer}
        />
      )}
    </div>
  );
}

type AnnotationSettingsProps = {
  search: SearchResult;
  open: boolean;
  setIsOpen: (open: boolean) => void;
  container?: HTMLElement | null;
};

function AnnotationSettings({
  search,
  open,
  setIsOpen,
  container,
}: AnnotationSettingsProps) {
  const { t } = useTranslation(["views/explore"]);
  const { annotationOffset, setAnnotationOffset } = useDetailStream();

  const ignoreNextOpenRef = useRef(false);

  useEffect(() => {
    setIsOpen(false);
    ignoreNextOpenRef.current = false;
  }, [search, setIsOpen]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        if (ignoreNextOpenRef.current) {
          ignoreNextOpenRef.current = false;
          return;
        }
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    },
    [setIsOpen],
  );

  const registerTriggerCloseIntent = useCallback(() => {
    if (open) {
      ignoreNextOpenRef.current = true;
    }
  }, [open]);

  const Overlay = isDesktop ? Popover : Drawer;
  const Trigger = isDesktop ? PopoverTrigger : DrawerTrigger;
  const Content = isDesktop ? PopoverContent : DrawerContent;
  const Title = isDesktop ? "div" : DrawerTitle;
  const contentProps = isDesktop
    ? { align: "end" as const, container: container ?? undefined }
    : {};

  return (
    <div className="ml-2">
      <Overlay modal={isDesktop} open={open} onOpenChange={handleOpenChange}>
        <Trigger asChild>
          <Button
            type="button"
            className="size-7 p-1.5"
            variant={open ? "select" : "ghost"}
            aria-label={t("trackingDetails.adjustAnnotationSettings")}
            aria-expanded={open}
            onPointerDown={registerTriggerCloseIntent}
            onKeyDown={(event) => {
              if (open && (event.key === "Enter" || event.key === " ")) {
                registerTriggerCloseIntent();
              }
            }}
          >
            <PiSlidersHorizontalBold className="size-5" />
          </Button>
        </Trigger>
        <Title className="sr-only">
          {t("trackingDetails.adjustAnnotationSettings")}
        </Title>
        <Content
          className={
            isDesktop
              ? "w-[90vw] max-w-md bg-background_alt p-0"
              : "mx-1 max-h-[75dvh] overflow-hidden rounded-t-2xl px-4 pb-4"
          }
          {...contentProps}
          {...(isDesktop ? { disablePortal: true } : {})}
          data-annotation-popover
        >
          <AnnotationSettingsPane
            event={search as unknown as Event}
            annotationOffset={annotationOffset}
            setAnnotationOffset={setAnnotationOffset}
          />
        </Content>
      </Overlay>
    </div>
  );
}

type DialogContentComponentProps = {
  page: SearchTab;
  search: SearchResult;
  isDesktop: boolean;
  apiHost: string;
  config?: FrigateConfig;
  searchTabs: SearchTab[];
  pageToggle: SearchTab;
  setPageToggle: (v: SearchTab) => void;
  setSearch: (s: SearchResult | undefined) => void;
  setInputFocused: React.Dispatch<React.SetStateAction<boolean>>;
  setSimilarity?: () => void;
  isPopoverOpen: boolean;
  setIsPopoverOpen: (open: boolean) => void;
  dialogContainer: HTMLDivElement | null;
  setShowNavigationButtons: React.Dispatch<React.SetStateAction<boolean>>;
};

function DialogContentComponent({
  page,
  search,
  isDesktop,
  apiHost,
  config,
  searchTabs,
  pageToggle,
  setPageToggle,
  setSearch,
  setInputFocused,
  setSimilarity,
  isPopoverOpen,
  setIsPopoverOpen,
  dialogContainer,
  setShowNavigationButtons,
}: DialogContentComponentProps) {
  if (page === "tracking_details") {
    return (
      <TrackingDetails
        className={cn(isDesktop ? "size-full" : "flex flex-col gap-4")}
        event={search as unknown as Event}
        tabs={
          isDesktop ? (
            <TabsWithActions
              search={search}
              searchTabs={searchTabs}
              pageToggle={pageToggle}
              setPageToggle={setPageToggle}
              config={config}
              setSearch={setSearch}
              setSimilarity={setSimilarity}
              isPopoverOpen={isPopoverOpen}
              setIsPopoverOpen={setIsPopoverOpen}
              dialogContainer={dialogContainer}
            />
          ) : undefined
        }
      />
    );
  }

  // Snapshot page content
  const snapshotElement = search.has_snapshot ? (
    <ObjectSnapshotTab
      className={isDesktop ? undefined : "mb-4"}
      search={
        {
          ...search,
          plus_id: config?.plus?.enabled ? search.plus_id : "not_enabled",
        } as unknown as Event
      }
    />
  ) : (
    <div
      className={cn(
        "max-w-lg",
        !isDesktop ? "mb-4 w-full" : "mx-auto size-full",
      )}
    >
      <img
        className="w-full select-none rounded-lg object-contain transition-opacity"
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
    </div>
  );

  if (isDesktop) {
    return (
      <div className="grid h-full w-full grid-cols-[60%_40%] gap-4">
        <div className="scrollbar-container min-w-0 overflow-y-auto overflow-x-hidden">
          {snapshotElement}
        </div>
        <div className="flex min-w-0 flex-col gap-4 pr-2">
          <TabsWithActions
            search={search}
            searchTabs={searchTabs}
            pageToggle={pageToggle}
            setPageToggle={setPageToggle}
            config={config}
            setSearch={setSearch}
            setSimilarity={setSimilarity}
            isPopoverOpen={isPopoverOpen}
            setIsPopoverOpen={setIsPopoverOpen}
            dialogContainer={dialogContainer}
          />
          <div className="scrollbar-container min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4">
            <ObjectDetailsTab
              search={search}
              config={config}
              setSearch={setSearch}
              setInputFocused={setInputFocused}
              setShowNavigationButtons={setShowNavigationButtons}
            />
          </div>
        </div>
      </div>
    );
  }

  // mobile
  return (
    <>
      {snapshotElement}
      <ObjectDetailsTab
        search={search}
        config={config}
        setSearch={setSearch}
        setInputFocused={setInputFocused}
        setShowNavigationButtons={setShowNavigationButtons}
      />
    </>
  );
}

type SearchDetailDialogProps = {
  search?: SearchResult;
  page: SearchTab;
  setSearch: (search: SearchResult | undefined) => void;
  setSearchPage: (page: SearchTab) => void;
  setSimilarity?: () => void;
  setInputFocused: React.Dispatch<React.SetStateAction<boolean>>;
  onPrevious?: () => void;
  onNext?: () => void;
};

export default function SearchDetailDialog({
  search,
  page,
  setSearch,
  setSearchPage,
  setSimilarity,
  setInputFocused,
  onPrevious,
  onNext,
}: SearchDetailDialogProps) {
  const { t } = useTranslation(["views/explore", "views/faceLibrary"]);
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const apiHost = useApiHost();

  // tabs

  const [pageToggle, setPageToggle] = useOptimisticState(
    page,
    setSearchPage,
    100,
  );

  // dialog and mobile page

  const [isOpen, setIsOpen] = useState(search != undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showNavigationButtons, setShowNavigationButtons] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(
    null,
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        setIsPopoverOpen(false);
        // short timeout to allow the mobile page animation
        // to complete before updating the state
        setTimeout(() => {
          setSearch(undefined);
        }, 300);
      }
    },
    [setSearch],
  );

  useLayoutEffect(() => {
    setDialogContainer(dialogContentRef.current);
  }, [isOpen, search?.id]);

  useEffect(() => {
    if (search) {
      setIsOpen(search != undefined);
    }
  }, [search]);

  // show/hide annotation settings is handled inside TabsWithActions

  const searchTabs = useMemo(() => {
    if (!config || !search) {
      return [];
    }

    const views = [...SEARCH_TABS];

    if (!search.has_clip) {
      const index = views.indexOf("tracking_details");
      views.splice(index, 1);
    }

    return views;
  }, [config, search]);

  useEffect(() => {
    if (searchTabs.length == 0) {
      return;
    }

    if (!searchTabs.includes(pageToggle)) {
      setSearchPage("snapshot");
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
    <DetailStreamProvider
      isDetailMode={true}
      currentTime={(search as unknown as Event)?.start_time ?? 0}
      camera={(search as unknown as Event)?.camera ?? ""}
      initialSelectedObjectIds={[(search as unknown as Event).id as string]}
    >
      <Overlay
        open={isOpen}
        onOpenChange={handleOpenChange}
        enableHistoryBack={true}
      >
        {isDesktop && onPrevious && onNext && showNavigationButtons && (
          <DialogPortal>
            <div className="pointer-events-none fixed inset-0 z-[51] flex items-center justify-center">
              <div
                className={cn(
                  "relative flex items-center justify-between",
                  "w-full",
                  // match dialog's max-width classes
                  "max-h-[95dvh] max-w-[85%] xl:max-w-[70%]",
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrevious?.();
                      }}
                      className="nav-button pointer-events-auto absolute -left-16 rounded-lg border bg-secondary/60 p-2 text-primary-variant shadow-lg backdrop-blur-sm hover:bg-secondary/80 hover:text-primary"
                      aria-label={t("searchResult.previousTrackedObject")}
                    >
                      <FaChevronLeft className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("searchResult.previousTrackedObject")}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNext?.();
                      }}
                      className="nav-button pointer-events-auto absolute -right-16 rounded-lg border bg-secondary/60 p-2 text-primary-variant shadow-lg backdrop-blur-sm hover:bg-secondary/80 hover:text-primary"
                      aria-label={t("searchResult.nextTrackedObject")}
                    >
                      <FaChevronRight className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("searchResult.nextTrackedObject")}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </DialogPortal>
        )}
        <Content
          ref={isDesktop ? dialogContentRef : undefined}
          className={cn(
            isDesktop && [
              "max-h-[95dvh] max-w-[85%] xl:max-w-[70%]",
              pageToggle === "tracking_details"
                ? "flex flex-col overflow-hidden"
                : "scrollbar-container overflow-y-auto",
            ],
            isMobile &&
              "scrollbar-container flex h-full flex-col overflow-y-auto px-4",
          )}
          onEscapeKeyDown={(event) => {
            if (isPopoverOpen) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (isPopoverOpen) {
              e.preventDefault();
            }
            const target = e.target as HTMLElement;
            if (target.closest(".nav-button")) {
              e.preventDefault();
            }
          }}
        >
          <Header className={cn(!isDesktop && "top-0 z-[60] mb-0")}>
            <Title>{t("trackedObjectDetails")}</Title>
            <Description className="sr-only">
              {t("trackedObjectDetails")}
              <span className="sr-only" tabIndex={0} />
            </Description>
          </Header>

          {!isDesktop && (
            <div className="flex w-full flex-col justify-center gap-4">
              <TabsWithActions
                search={search}
                searchTabs={searchTabs}
                pageToggle={pageToggle}
                setPageToggle={setPageToggle}
                config={config}
                setSearch={setSearch}
                setSimilarity={setSimilarity}
                isPopoverOpen={isPopoverOpen}
                setIsPopoverOpen={setIsPopoverOpen}
                dialogContainer={dialogContainer}
              />
            </div>
          )}

          <DialogContentComponent
            page={page}
            search={search}
            isDesktop={isDesktop}
            apiHost={apiHost}
            config={config}
            searchTabs={searchTabs}
            pageToggle={pageToggle}
            setPageToggle={setPageToggle}
            setSearch={setSearch}
            setInputFocused={setInputFocused}
            setSimilarity={setSimilarity}
            isPopoverOpen={isPopoverOpen}
            setIsPopoverOpen={setIsPopoverOpen}
            dialogContainer={dialogContainer}
            setShowNavigationButtons={setShowNavigationButtons}
          />
        </Content>
      </Overlay>
    </DetailStreamProvider>
  );
}

type ObjectDetailsTabProps = {
  search: SearchResult;
  config?: FrigateConfig;
  setSearch: (search: SearchResult | undefined) => void;
  setInputFocused: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNavigationButtons?: React.Dispatch<React.SetStateAction<boolean>>;
};
function ObjectDetailsTab({
  search,
  config,
  setSearch,
  setInputFocused,
  setShowNavigationButtons,
}: ObjectDetailsTabProps) {
  const { t, i18n } = useTranslation([
    "views/explore",
    "views/faceLibrary",
    "components/dialog",
  ]);

  const apiHost = useApiHost();
  const hasCustomClassificationModels = useMemo(
    () => Object.keys(config?.classification?.custom ?? {}).length > 0,
    [config],
  );
  const { data: modelAttributes } = useSWR<Record<string, string[]>>(
    hasCustomClassificationModels && search
      ? `classification/attributes?object_type=${encodeURIComponent(search.label)}&group_by_model=true`
      : null,
  );

  // mutation / revalidation

  const mutate = useGlobalMutation();

  // Helper to map over SWR cached search results while preserving
  // either paginated format (SearchResult[][]) or flat format (SearchResult[])
  const mapSearchResults = useCallback(
    (
      currentData: SearchResult[][] | SearchResult[] | undefined,
      fn: (event: SearchResult) => SearchResult,
    ) => {
      if (!currentData) return currentData;
      if (Array.isArray(currentData[0])) {
        return (currentData as SearchResult[][]).map((page) => page.map(fn));
      }
      return (currentData as SearchResult[]).map(fn);
    },
    [],
  );

  // users

  const isAdmin = useIsAdmin();

  // data

  const [desc, setDesc] = useState(search?.data.description);
  const [isSubLabelDialogOpen, setIsSubLabelDialogOpen] = useState(false);
  const [isLPRDialogOpen, setIsLPRDialogOpen] = useState(false);
  const [isAttributesDialogOpen, setIsAttributesDialogOpen] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const originalDescRef = useRef<string | null>(null);

  const handleDescriptionFocus = useCallback(() => {
    setInputFocused(true);
  }, [setInputFocused]);

  const handleDescriptionBlur = useCallback(() => {
    setInputFocused(false);
  }, [setInputFocused]);

  // we have to make sure the current selected search item stays in sync
  useEffect(() => setDesc(search?.data.description ?? ""), [search]);

  useEffect(() => setIsAttributesDialogOpen(false), [search?.id]);

  useEffect(() => {
    const anyDialogOpen =
      isSubLabelDialogOpen || isLPRDialogOpen || isAttributesDialogOpen;
    setShowNavigationButtons?.(!anyDialogOpen);
  }, [
    isSubLabelDialogOpen,
    isLPRDialogOpen,
    isAttributesDialogOpen,
    setShowNavigationButtons,
  ]);

  const formattedDate = useFormattedTimestamp(
    search?.start_time ?? 0,
    config?.ui.time_format == "24hour"
      ? t("time.formattedTimestampMonthDayYearHourMinute.24hour", {
          ns: "common",
        })
      : t("time.formattedTimestampMonthDayYearHourMinute.12hour", {
          ns: "common",
        }),
    config?.ui.timezone,
  );

  const topScore = useMemo(() => {
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

  const snapScore = useMemo(() => {
    if (!search?.has_snapshot) {
      return undefined;
    }

    const value = search.data.score ?? search.score ?? 0;

    return Math.floor(value * 100);
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

  // Extract current attribute selections grouped by model
  const selectedAttributesByModel = useMemo(() => {
    if (!search || !modelAttributes) {
      return {};
    }

    const dataAny = search.data as Record<string, unknown>;
    const selections: Record<string, string | null> = {};

    // Initialize all models with null
    Object.keys(modelAttributes).forEach((modelName) => {
      selections[modelName] = null;
    });

    // Find which attribute is selected for each model
    Object.keys(modelAttributes).forEach((modelName) => {
      const value = dataAny[modelName];
      if (
        typeof value === "string" &&
        modelAttributes[modelName].includes(value)
      ) {
        selections[modelName] = value;
      }
    });

    return selections;
  }, [search, modelAttributes]);

  // Get flat list of selected attributes for display
  const eventAttributes = useMemo(() => {
    return Object.values(selectedAttributesByModel)
      .filter((attr): attr is string => attr !== null)
      .sort((a, b) => a.localeCompare(b));
  }, [selectedAttributesByModel]);

  const isEventsKey = useCallback((key: unknown): boolean => {
    const candidate = Array.isArray(key) ? key[0] : key;
    const EVENTS_KEY_PATTERNS = ["events", "events/search", "events/explore"];
    return (
      typeof candidate === "string" &&
      EVENTS_KEY_PATTERNS.some((p) => candidate.includes(p))
    );
  }, []);

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
          (key) => isEventsKey(key),
          (currentData: SearchResult[][] | SearchResult[] | undefined) =>
            mapSearchResults(currentData, (event) =>
              event.id === search.id
                ? { ...event, data: { ...event.data, description: desc } }
                : event,
            ),
          {
            optimisticData: true,
            rollbackOnError: true,
            revalidate: false,
          },
        );
        setSearch({ ...search, data: { ...search.data, description: desc } });
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
  }, [desc, search, mutate, t, mapSearchResults, isEventsKey, setSearch]);

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
              (key) => isEventsKey(key),
              (currentData: SearchResult[][] | SearchResult[] | undefined) =>
                mapSearchResults(currentData, (event) =>
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
                ),
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
    [search, apiHost, mutate, setSearch, t, mapSearchResults, isEventsKey],
  );

  // recognized plate

  const handleLPRSave = useCallback(
    (text: string) => {
      if (!search) return;

      // set score to 1.0 if we're manually entering a new plate
      const plateScore = text === "" ? undefined : 1.0;

      axios
        .post(`${apiHost}api/events/${search.id}/recognized_license_plate`, {
          recognizedLicensePlate: text,
          recognizedLicensePlateScore: plateScore,
        })
        .then((response) => {
          if (response.status === 200) {
            toast.success(t("details.item.toast.success.updatedLPR"), {
              position: "top-center",
            });

            mutate(
              (key) => isEventsKey(key),
              (currentData: SearchResult[][] | SearchResult[] | undefined) =>
                mapSearchResults(currentData, (event) =>
                  event.id === search.id
                    ? {
                        ...event,
                        data: {
                          ...event.data,
                          recognized_license_plate: text,
                          recognized_license_plate_score: plateScore,
                        },
                      }
                    : event,
                ),
              {
                optimisticData: true,
                rollbackOnError: true,
                revalidate: false,
              },
            );

            setSearch({
              ...search,
              data: {
                ...search.data,
                recognized_license_plate: text,
                recognized_license_plate_score: plateScore,
              },
            });
            setIsLPRDialogOpen(false);
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("details.item.toast.error.updatedLPRFailed", {
              errorMessage,
            }),
            {
              position: "top-center",
            },
          );
        });
    },
    [search, apiHost, mutate, setSearch, t, mapSearchResults, isEventsKey],
  );

  const handleAttributesSave = useCallback(
    (selectedAttributes: string[]) => {
      if (!search) return;

      axios
        .post(`${apiHost}api/events/${search.id}/attributes`, {
          attributes: selectedAttributes,
        })
        .then((response) => {
          const applied = Array.isArray(response.data?.applied)
            ? (response.data.applied as {
                model?: string;
                label?: string | null;
                score?: number | null;
              }[])
            : [];

          toast.success(t("details.item.toast.success.updatedAttributes"), {
            position: "top-center",
          });

          const applyUpdatedAttributes = (event: SearchResult) => {
            if (event.id !== search.id) return event;

            const updatedData: Record<string, unknown> = { ...event.data };

            applied.forEach(({ model, label, score }) => {
              if (!model) return;
              updatedData[model] = label ?? null;
              updatedData[`${model}_score`] = score ?? null;
            });

            return { ...event, data: updatedData } as SearchResult;
          };

          mutate(
            (key) => isEventsKey(key),
            (currentData: SearchResult[][] | SearchResult[] | undefined) =>
              mapSearchResults(currentData, applyUpdatedAttributes),
            {
              optimisticData: true,
              rollbackOnError: true,
              revalidate: false,
            },
          );

          setSearch(applyUpdatedAttributes(search));
          setIsAttributesDialogOpen(false);
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";

          toast.error(
            t("details.item.toast.error.updatedAttributesFailed", {
              errorMessage,
            }),
            {
              position: "top-center",
            },
          );
        });
    },
    [search, apiHost, mutate, t, mapSearchResults, isEventsKey, setSearch],
  );

  // speech transcription

  const onTranscribe = useCallback(() => {
    axios
      .put(`/audio/transcribe`, { event_id: search.id })
      .then((resp) => {
        if (resp.status == 202) {
          toast.success(t("details.item.toast.success.audioTranscription"), {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("details.item.toast.error.audioTranscription", {
            errorMessage,
          }),
          {
            position: "top-center",
          },
        );
      });
  }, [search, t]);

  // audio transcription processing state

  const { payload: audioTranscriptionProcessState } =
    useAudioTranscriptionProcessState();

  // frigate+ submission

  type SubmissionState = "reviewing" | "uploading" | "submitted";
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
      setSearch({ ...search, plus_id: "new_upload" });
      mutate(
        (key) => isEventsKey(key),
        (currentData: SearchResult[][] | SearchResult[] | undefined) =>
          mapSearchResults(currentData, (event) =>
            event.id === search.id
              ? { ...event, plus_id: "new_upload" }
              : event,
          ),
        {
          optimisticData: true,
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [search, mutate, mapSearchResults, setSearch, isEventsKey],
  );

  const popoverContainerRef = useRef<HTMLDivElement | null>(null);
  const canRegenerate = !!(
    config?.cameras[search.camera].objects.genai.enabled && search.end_time
  );
  const showGenAIPlaceholder = !!(
    config?.cameras[search.camera].objects.genai.enabled &&
    !search.end_time &&
    (config.cameras[search.camera].objects.genai.required_zones.length === 0 ||
      search.zones.some((zone) =>
        config.cameras[search.camera].objects.genai.required_zones.includes(
          zone,
        ),
      )) &&
    (config.cameras[search.camera].objects.genai.objects.length === 0 ||
      config.cameras[search.camera].objects.genai.objects.includes(
        search.label,
      ))
  );
  return (
    <div ref={popoverContainerRef} className="flex flex-col gap-5">
      <div className="flex w-full flex-row">
        <div className="flex w-full flex-col gap-3">
          <div className="w-full">
            <div className="flex w-full flex-row flex-wrap gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="text-sm text-primary/40">
                      {t("details.label")}
                    </div>
                    <div className="flex flex-row items-center gap-2 text-sm smart-capitalize">
                      {getIconForLabel(search.label, "size-4 text-primary")}
                      {getTranslatedLabel(search.label, search.data.type)}
                      {search.sub_label && ` (${search.sub_label})`}
                      {isAdmin && search.end_time && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <FaPencilAlt
                                className="size-4 cursor-pointer text-primary/40 hover:text-primary/80"
                                onClick={() => setIsSubLabelDialogOpen(true)}
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipContent>
                              {t("details.editSubLabel.title")}
                            </TooltipContent>
                          </TooltipPortal>
                        </Tooltip>
                      )}
                    </div>
                  </div>

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
                          <PopoverContent
                            container={popoverContainerRef.current}
                            className="w-80 text-xs"
                          >
                            {t("details.topScore.info")}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="text-sm">
                      {topScore}%{subLabelScore && ` (${subLabelScore}%)`}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="text-sm text-primary/40">
                      {t("details.camera")}
                    </div>
                    <div className="text-sm smart-capitalize">
                      <CameraNameLabel camera={search.camera} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3">
                  {snapScore != undefined && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-sm text-primary/40">
                        <div className="flex flex-row items-center gap-1">
                          {t("details.snapshotScore.label")}
                        </div>
                      </div>
                      <div className="text-sm">{snapScore}%</div>
                    </div>
                  )}

                  {averageEstimatedSpeed && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-sm text-primary/40">
                        {t("details.estimatedSpeed")}
                      </div>
                      <div className="flex flex-col space-y-0.5 text-sm">
                        <div className="flex flex-row items-center gap-2">
                          {averageEstimatedSpeed}{" "}
                          {config?.ui.unit_system == "imperial"
                            ? t("unit.speed.mph", { ns: "common" })
                            : t("unit.speed.kph", { ns: "common" })}
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
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <div className="text-sm text-primary/40">
                      {t("details.timestamp")}
                    </div>
                    <div className="text-sm">{formattedDate}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {search?.data.recognized_license_plate && (
            <div className="flex flex-col gap-1.5">
              <div className="text-sm text-primary/40">
                {t("details.recognizedLicensePlate")}
              </div>
              <div className="flex flex-col space-y-0.5 text-sm">
                <div className="flex flex-row items-center gap-2">
                  {search.data.recognized_license_plate}{" "}
                  {recognizedLicensePlateScore &&
                    ` (${recognizedLicensePlateScore}%)`}
                  {isAdmin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <FaPencilAlt
                            className="size-4 cursor-pointer text-primary/40 hover:text-primary/80"
                            onClick={() => setIsLPRDialogOpen(true)}
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent>
                          {t("details.editLPR.title")}
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasCustomClassificationModels &&
            modelAttributes &&
            Object.keys(modelAttributes).length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm text-primary/40">
                  {t("details.attributes")}
                  {isAdmin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <FaPencilAlt
                            className="size-4 cursor-pointer text-primary/40 hover:text-primary/80"
                            onClick={() => setIsAttributesDialogOpen(true)}
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent>
                          {t("button.edit", { ns: "common" })}
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  )}
                </div>
                <div className="text-sm">
                  {eventAttributes.length > 0
                    ? eventAttributes.join(", ")
                    : t("label.none", { ns: "common" })}
                </div>
              </div>
            )}
        </div>
      </div>

      {isAdmin &&
        search.data.type === "object" &&
        config?.plus?.enabled &&
        search.end_time != undefined &&
        search.has_snapshot && (
          <div
            className={cn(
              "my-2 flex w-full flex-col justify-between gap-1.5",
              state == "submitted" && "flex-row",
            )}
          >
            <div className="text-sm text-primary/40">
              <div className="flex flex-row items-center gap-1">
                {t("explore.plus.submitToPlus.label", {
                  ns: "components/dialog",
                })}
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="cursor-pointer p-0">
                      <LuInfo className="size-4" />
                      <span className="sr-only">Info</span>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    container={popoverContainerRef.current}
                    className="w-80 text-xs"
                  >
                    {t("explore.plus.submitToPlus.desc", {
                      ns: "components/dialog",
                    })}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex flex-row items-center justify-between gap-2 text-sm">
              {state == "reviewing" && (
                <>
                  <div>
                    {i18n.language === "en" ? (
                      // English with a/an logic plus label
                      <>
                        {/^[aeiou]/i.test(search?.label || "") ? (
                          <Trans
                            ns="components/dialog"
                            values={{ label: search?.label }}
                          >
                            explore.plus.review.question.ask_an
                          </Trans>
                        ) : (
                          <Trans
                            ns="components/dialog"
                            values={{ label: search?.label }}
                          >
                            explore.plus.review.question.ask_a
                          </Trans>
                        )}
                      </>
                    ) : (
                      // For other languages
                      <Trans
                        ns="components/dialog"
                        values={{
                          untranslatedLabel: search?.label,
                          translatedLabel: getTranslatedLabel(search?.label),
                        }}
                      >
                        explore.plus.review.question.ask_full
                      </Trans>
                    )}
                  </div>
                  <div className="flex max-w-xl flex-row gap-2">
                    <Button
                      className="flex-1 bg-success"
                      aria-label={t("button.yes", { ns: "common" })}
                      onClick={() => {
                        setState("uploading");
                        onSubmitToPlus(false);
                      }}
                    >
                      {t("button.yes", { ns: "common" })}
                    </Button>
                    <Button
                      className="flex-1 text-white"
                      aria-label={t("button.no", { ns: "common" })}
                      variant="destructive"
                      onClick={() => {
                        setState("uploading");
                        onSubmitToPlus(true);
                      }}
                    >
                      {t("button.no", { ns: "common" })}
                    </Button>
                  </div>
                </>
              )}
              {state == "uploading" && <ActivityIndicator />}
              {state == "submitted" && (
                <div className="flex flex-row items-center justify-center gap-2">
                  <FaCheckCircle className="size-4 text-success" />
                  {t("explore.plus.review.state.submitted", {
                    ns: "components/dialog",
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-start gap-3">
          <div className="text-sm text-primary/40">
            {t("details.description.label")}
          </div>
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label={t("button.edit", { ns: "common" })}
                  className="text-primary/40 hover:text-primary/80"
                  onClick={() => {
                    originalDescRef.current = desc ?? "";
                    setIsEditingDesc(true);
                  }}
                >
                  <FaPencilAlt className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t("button.edit", { ns: "common" })}
              </TooltipContent>
            </Tooltip>

            {config?.cameras[search?.camera].audio_transcription.enabled &&
              search?.label == "speech" &&
              search?.end_time &&
              search?.has_clip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label={t("itemMenu.audioTranscription.label")}
                      className={cn(
                        "text-primary/40",
                        audioTranscriptionProcessState === "processing"
                          ? "cursor-not-allowed"
                          : "hover:text-primary/80",
                      )}
                      onClick={onTranscribe}
                      disabled={audioTranscriptionProcessState === "processing"}
                    >
                      {audioTranscriptionProcessState === "processing" ? (
                        <ActivityIndicator className="size-4" />
                      ) : (
                        <FaMicrophone className="size-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("itemMenu.audioTranscription.label")}
                  </TooltipContent>
                </Tooltip>
              )}

            {canRegenerate && (
              <div className="relative">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label={t("details.button.regenerate.label")}
                          className="text-primary/40 hover:text-primary/80"
                        >
                          <HiSparkles className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("details.button.regenerate.title")}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent>
                    {search.has_snapshot && (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        aria-label={t("details.regenerateFromSnapshot")}
                        onClick={() => regenerateDescription("snapshot")}
                      >
                        {t("details.regenerateFromSnapshot")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="cursor-pointer"
                      aria-label={t("details.regenerateFromThumbnails")}
                      onClick={() => regenerateDescription("thumbnails")}
                    >
                      {t("details.regenerateFromThumbnails")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {!isEditingDesc ? (
          showGenAIPlaceholder ? (
            <div className="flex h-32 flex-col items-center justify-center gap-3 border p-4 text-sm text-primary/40">
              <div className="flex">
                <ActivityIndicator />
              </div>
              <div className="flex">{t("details.description.aiTips")}</div>
            </div>
          ) : (
            <div className="overflow-auto text-sm text-primary">
              {desc || t("label.none", { ns: "common" })}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <Textarea
              className="text-md h-32 md:text-sm"
              placeholder={t("details.description.placeholder")}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onFocus={handleDescriptionFocus}
              onBlur={handleDescriptionBlur}
              autoFocus
            />
            <div className="mb-10 flex flex-row justify-end gap-5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={t("button.cancel", { ns: "common" })}
                    className="text-primary/40 hover:text-primary"
                    onClick={() => {
                      setIsEditingDesc(false);
                      setDesc(originalDescRef.current ?? "");
                    }}
                  >
                    <FaTimes className="size-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("button.cancel", { ns: "common" })}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={t("button.save", { ns: "common" })}
                    className="text-primary/40 hover:text-primary/80"
                    onClick={() => {
                      setIsEditingDesc(false);
                      updateDescription();
                    }}
                  >
                    <FaCheck className="size-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("button.save", { ns: "common" })}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        <TextEntryDialog
          open={isSubLabelDialogOpen}
          setOpen={setIsSubLabelDialogOpen}
          title={t("details.editSubLabel.title")}
          description={
            search.label
              ? t("details.editSubLabel.desc", {
                  label: search.label,
                })
              : t("details.editSubLabel.descNoLabel")
          }
          onSave={handleSubLabelSave}
          defaultValue={search?.sub_label || ""}
          allowEmpty={true}
        />
        <TextEntryDialog
          open={isLPRDialogOpen}
          setOpen={setIsLPRDialogOpen}
          title={t("details.editLPR.title")}
          description={
            search.label
              ? t("details.editLPR.desc", {
                  label: search.label,
                })
              : t("details.editLPR.descNoLabel")
          }
          onSave={handleLPRSave}
          defaultValue={search?.data.recognized_license_plate || ""}
          allowEmpty={true}
        />
        <AttributeSelectDialog
          open={isAttributesDialogOpen}
          setOpen={setIsAttributesDialogOpen}
          title={t("details.editAttributes.title")}
          description={t("details.editAttributes.desc", {
            label: search.label,
          })}
          onSave={handleAttributesSave}
          selectedAttributes={selectedAttributesByModel}
          modelAttributes={modelAttributes ?? {}}
        />
      </div>
    </div>
  );
}

type ObjectSnapshotTabProps = {
  search: Event;
  className?: string;
  onEventUploaded?: () => void;
};
export function ObjectSnapshotTab({
  search,
  className,
}: ObjectSnapshotTabProps) {
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  return (
    <div className={cn("relative", isDesktop && "size-full", className)}>
      <ImageLoadingIndicator
        className="absolute inset-0 aspect-video min-h-[60dvh] w-full"
        imgLoaded={imgLoaded}
      />
      <div
        className={cn(
          "flex size-full items-center",
          imgLoaded ? "visible" : "invisible",
        )}
      >
        <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
          <div className="flex w-full flex-col space-y-3 overflow-hidden">
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
                <div className="relative mx-auto flex h-full">
                  <img
                    ref={imgRef}
                    className="mx-auto max-h-[60dvh] rounded-lg bg-background object-contain"
                    src={`${baseUrl}api/events/${search?.id}/snapshot.jpg`}
                    alt={`${search?.label}`}
                    loading={isSafari ? "eager" : "lazy"}
                    onLoad={() => {
                      onImgLoad();
                    }}
                  />
                </div>
              )}
            </TransformComponent>
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
  const clipTimeRange = useMemo(() => {
    const startTime = search.start_time - REVIEW_PADDING;
    const endTime = (search.end_time ?? Date.now() / 1000) + REVIEW_PADDING;
    return `start/${startTime}/end/${endTime}`;
  }, [search]);

  const source = `${baseUrl}vod/${search.camera}/${clipTimeRange}/index.m3u8`;

  return (
    <>
      <span tabIndex={0} className="sr-only" />
      <GenericVideoPlayer source={source} />
    </>
  );
}
