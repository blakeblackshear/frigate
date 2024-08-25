import { baseUrl } from "@/api/baseUrl";
import {
  CamerasFilterButton,
  GeneralFilterContent,
} from "@/components/filter/ReviewFilterGroup";
import Chip from "@/components/indicators/Chip";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DualThumbSlider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Event } from "@/types/event";
import { ATTRIBUTE_LABELS, FrigateConfig } from "@/types/frigateConfig";
import { getIconForLabel } from "@/utils/iconUtil";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import {
  FaList,
  FaSort,
  FaSortAmountDown,
  FaSortAmountUp,
} from "react-icons/fa";
import { LuFolderX } from "react-icons/lu";
import { PiSlidersHorizontalFill } from "react-icons/pi";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const API_LIMIT = 100;

export default function SubmitPlus() {
  const { data: config } = useSWR<FrigateConfig>("config");

  useEffect(() => {
    document.title = "Plus - Frigate";
  }, []);

  // filters

  const [selectedCameras, setSelectedCameras] = useState<string[]>();
  const [selectedLabels, setSelectedLabels] = useState<string[]>();
  const [scoreRange, setScoreRange] = useState<number[]>();

  // sort

  const [sort, setSort] = useState<string>();

  // data

  const eventFetcher = useCallback((key: string) => {
    const [path, params] = Array.isArray(key) ? key : [key, undefined];
    return axios.get(path, { params }).then((res) => res.data);
  }, []);

  const getKey = useCallback(
    (index: number, prevData: Event[]) => {
      if (index > 0) {
        const lastDate = prevData[prevData.length - 1].start_time;
        return [
          "events",
          {
            limit: API_LIMIT,
            in_progress: 0,
            is_submitted: 0,
            has_snapshot: 1,
            cameras: selectedCameras ? selectedCameras.join(",") : null,
            labels: selectedLabels ? selectedLabels.join(",") : null,
            min_score: scoreRange ? scoreRange[0] : null,
            max_score: scoreRange ? scoreRange[1] : null,
            sort: sort ? sort : null,
            before: lastDate,
          },
        ];
      }

      return [
        "events",
        {
          limit: 100,
          in_progress: 0,
          is_submitted: 0,
          has_snapshot: 1,
          cameras: selectedCameras ? selectedCameras.join(",") : null,
          labels: selectedLabels ? selectedLabels.join(",") : null,
          min_score: scoreRange ? scoreRange[0] : null,
          max_score: scoreRange ? scoreRange[1] : null,
          sort: sort ? sort : null,
        },
      ];
    },
    [scoreRange, selectedCameras, selectedLabels, sort],
  );

  const {
    data: eventPages,
    mutate: refresh,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite<Event[]>(getKey, eventFetcher, {
    revalidateOnFocus: false,
  });

  const events = useMemo(
    () => (eventPages ? eventPages.flat() : []),
    [eventPages],
  );

  const [upload, setUpload] = useState<Event>();

  // paging

  const isDone = useMemo(
    () => (eventPages?.at(-1)?.length ?? 0) < API_LIMIT,
    [eventPages],
  );

  const pagingObserver = useRef<IntersectionObserver | null>();
  const lastEventRef = useCallback(
    (node: HTMLElement | null) => {
      if (isValidating) return;
      if (pagingObserver.current) pagingObserver.current.disconnect();
      try {
        pagingObserver.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !isDone) {
            setSize(size + 1);
          }
        });
        if (node) pagingObserver.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    [isValidating, isDone, size, setSize],
  );

  // layout

  const grow = useMemo(() => {
    if (!config || !upload) {
      return "";
    }

    const camera = config.cameras[upload.camera];

    if (!camera) {
      return "";
    }

    if (camera.detect.width / camera.detect.height < 16 / 9) {
      return "aspect-video object-contain";
    }

    return "";
  }, [config, upload]);

  const onSubmitToPlus = useCallback(
    async (falsePositive: boolean) => {
      if (!upload) {
        return;
      }

      falsePositive
        ? axios.put(`events/${upload.id}/false_positive`)
        : axios.post(`events/${upload.id}/plus`, {
            include_annotation: 1,
          });

      refresh(
        (data: Event[][] | undefined) => {
          if (!data) {
            return data;
          }

          let pageIndex = -1;
          let index = -1;

          data.forEach((page, pIdx) => {
            const search = page.findIndex((e) => e.id == upload.id);

            if (search != -1) {
              pageIndex = pIdx;
              index = search;
            }
          });

          if (index == -1) {
            return data;
          }

          return [
            ...data.slice(0, pageIndex),
            [
              ...data[pageIndex].slice(0, index),
              { ...data[pageIndex][index], plus_id: "new_upload" },
              ...data[pageIndex].slice(index + 1),
            ],
            ...data.slice(pageIndex + 1),
          ];
        },
        { revalidate: false, populateCache: true },
      );
      setUpload(undefined);
    },
    [refresh, upload],
  );

  return (
    <div className="flex size-full flex-col">
      <div className="scrollbar-container flex h-16 w-full items-center justify-between overflow-x-auto px-2">
        <PlusFilterGroup
          selectedCameras={selectedCameras}
          selectedLabels={selectedLabels}
          selectedScoreRange={scoreRange}
          setSelectedCameras={setSelectedCameras}
          setSelectedLabels={setSelectedLabels}
          setSelectedScoreRange={setScoreRange}
        />
        <PlusSortSelector selectedSort={sort} setSelectedSort={setSort} />
      </div>
      <div className="no-scrollbar flex size-full flex-1 flex-wrap content-start gap-2 overflow-y-auto md:gap-4">
        {!events?.length ? (
          <>
            {isValidating ? (
              <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            ) : (
              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
                <LuFolderX className="size-16" />
                No snapshots found
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid w-full gap-2 p-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <Dialog
                open={upload != undefined}
                onOpenChange={(open) => (!open ? setUpload(undefined) : null)}
              >
                <DialogContent className="md:max-w-3xl lg:max-w-4xl xl:max-w-7xl">
                  <TransformWrapper
                    minScale={1.0}
                    wheel={{ smoothStep: 0.005 }}
                  >
                    <DialogHeader>
                      <DialogTitle>Submit To Frigate+</DialogTitle>
                      <DialogDescription>
                        Objects in locations you want to avoid are not false
                        positives. Submitting them as false positives will
                        confuse the model.
                      </DialogDescription>
                    </DialogHeader>
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
                      {upload?.id && (
                        <img
                          className={`w-full ${grow} bg-black`}
                          src={`${baseUrl}api/events/${upload?.id}/snapshot.jpg`}
                          alt={`${upload?.label}`}
                        />
                      )}
                    </TransformComponent>
                    <DialogFooter>
                      <Button onClick={() => setUpload(undefined)}>
                        Cancel
                      </Button>
                      <Button
                        className="bg-success"
                        onClick={() => onSubmitToPlus(false)}
                      >
                        This is a {upload?.label}
                      </Button>
                      <Button
                        className="text-white"
                        variant="destructive"
                        onClick={() => onSubmitToPlus(true)}
                      >
                        This is not a {upload?.label}
                      </Button>
                    </DialogFooter>
                  </TransformWrapper>
                </DialogContent>
              </Dialog>

              {events?.map((event) => {
                if (event.data.type != "object" || event.plus_id) {
                  return;
                }

                return (
                  <div
                    key={event.id}
                    className="relative flex aspect-video w-full cursor-pointer items-center justify-center rounded-lg bg-black md:rounded-2xl"
                    onClick={() => setUpload(event)}
                  >
                    <div className="absolute left-0 top-2 z-40">
                      <Tooltip>
                        <div className="flex">
                          <TooltipTrigger asChild>
                            <div className="mx-3 pb-1 text-sm text-white">
                              <Chip
                                className={`z-0 flex items-center justify-between space-x-1 bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500`}
                              >
                                {[event.label].map((object) => {
                                  return getIconForLabel(
                                    object,
                                    "size-3 text-white",
                                  );
                                })}
                                <div className="text-xs">
                                  {Math.round(event.data.score * 100)}%
                                </div>
                              </Chip>
                            </div>
                          </TooltipTrigger>
                        </div>
                        <TooltipContent className="capitalize">
                          {[event.label]
                            .map((text) => capitalizeFirstLetter(text))
                            .sort()
                            .join(", ")
                            .replaceAll("-verified", "")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <img
                      className="aspect-video h-full rounded-lg object-contain md:rounded-2xl"
                      src={`${baseUrl}api/events/${event.id}/snapshot.jpg`}
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
            {!isDone && isValidating ? (
              <div className="flex w-full items-center justify-center">
                <ActivityIndicator />
              </div>
            ) : (
              <div ref={lastEventRef} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

type PlusFilterGroupProps = {
  selectedCameras: string[] | undefined;
  selectedLabels: string[] | undefined;
  selectedScoreRange: number[] | undefined;
  setSelectedCameras: (cameras: string[] | undefined) => void;
  setSelectedLabels: (cameras: string[] | undefined) => void;
  setSelectedScoreRange: (range: number[] | undefined) => void;
};
function PlusFilterGroup({
  selectedCameras,
  selectedLabels,
  selectedScoreRange,
  setSelectedCameras,
  setSelectedLabels,
  setSelectedScoreRange,
}: PlusFilterGroupProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const allCameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.keys(config.cameras);
  }, [config]);
  const allLabels = useMemo<string[]>(() => {
    if (!config) {
      return [];
    }

    const labels = new Set<string>();
    const cameras = selectedCameras || Object.keys(config.cameras);

    cameras.forEach((camera) => {
      const cameraConfig = config.cameras[camera];
      cameraConfig.objects.track.forEach((label) => {
        if (!ATTRIBUTE_LABELS.includes(label)) {
          labels.add(label);
        }
      });
    });

    return [...labels].sort();
  }, [config, selectedCameras]);

  const [open, setOpen] = useState<"none" | "camera" | "label" | "score">(
    "none",
  );
  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    undefined,
  );
  const [currentScoreRange, setCurrentScoreRange] = useState<
    number[] | undefined
  >(undefined);

  const Menu = isMobile ? Drawer : DropdownMenu;
  const Trigger = isMobile ? DrawerTrigger : DropdownMenuTrigger;
  const Content = isMobile ? DrawerContent : DropdownMenuContent;

  return (
    <div className="flex h-full items-center justify-start gap-2">
      <CamerasFilterButton
        allCameras={allCameras}
        groups={[]}
        selectedCameras={selectedCameras}
        updateCameraFilter={setSelectedCameras}
      />
      <Menu
        open={open == "label"}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentLabels(selectedLabels);
          }
          setOpen(open ? "label" : "none");
        }}
      >
        <Trigger asChild>
          <Button
            className="flex items-center gap-2 capitalize"
            size="sm"
            variant={selectedLabels == undefined ? "default" : "select"}
          >
            <FaList
              className={`${selectedLabels == undefined ? "text-secondary-foreground" : "text-selected-foreground"}`}
            />
            <div className="hidden text-primary md:block">
              {selectedLabels == undefined
                ? "All Labels"
                : `${selectedLabels.length} Labels`}
            </div>
          </Button>
        </Trigger>
        <Content className={isMobile ? "max-h-[75dvh]" : ""}>
          <GeneralFilterContent
            allLabels={allLabels}
            selectedLabels={selectedLabels}
            currentLabels={currentLabels}
            setCurrentLabels={setCurrentLabels}
            updateLabelFilter={setSelectedLabels}
            onClose={() => setOpen("none")}
          />
        </Content>
      </Menu>
      <Menu
        open={open == "score"}
        onOpenChange={(open) => {
          setOpen(open ? "score" : "none");
        }}
      >
        <Trigger asChild>
          <Button
            className="flex items-center gap-2 capitalize"
            size="sm"
            variant={selectedScoreRange == undefined ? "default" : "select"}
          >
            <PiSlidersHorizontalFill
              className={`${selectedScoreRange == undefined ? "text-secondary-foreground" : "text-selected-foreground"}`}
            />
            <div className="hidden text-primary md:block">
              {selectedScoreRange == undefined
                ? "Score Range"
                : `${Math.round(selectedScoreRange[0] * 100)}% - ${Math.round(selectedScoreRange[1] * 100)}%`}
            </div>
          </Button>
        </Trigger>
        <Content
          className={`flex min-w-80 flex-col justify-center p-2 ${isMobile ? "gap-2 *:max-h-[75dvh]" : ""}`}
        >
          <div className="flex items-center gap-1">
            <Input
              className="w-12"
              inputMode="numeric"
              value={Math.round((currentScoreRange?.at(0) ?? 0.5) * 100)}
              onChange={(e) => {
                const value = e.target.value;

                if (value) {
                  setCurrentScoreRange([
                    parseInt(value) / 100.0,
                    currentScoreRange?.at(1) ?? 1.0,
                  ]);
                }
              }}
            />
            <DualThumbSlider
              className="w-full"
              min={0.5}
              max={1.0}
              step={0.01}
              value={currentScoreRange ?? [0.5, 1.0]}
              onValueChange={setCurrentScoreRange}
            />
            <Input
              className="w-12"
              inputMode="numeric"
              value={Math.round((currentScoreRange?.at(1) ?? 1.0) * 100)}
              onChange={(e) => {
                const value = e.target.value;

                if (value) {
                  setCurrentScoreRange([
                    currentScoreRange?.at(0) ?? 0.5,
                    parseInt(value) / 100.0,
                  ]);
                }
              }}
            />
          </div>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-evenly p-2">
            <Button
              variant="select"
              onClick={() => {
                setSelectedScoreRange(currentScoreRange);
                setOpen("none");
              }}
            >
              Apply
            </Button>
            <Button
              onClick={() => {
                setCurrentScoreRange(undefined);
                setSelectedScoreRange(undefined);
              }}
            >
              Reset
            </Button>
          </div>
        </Content>
      </Menu>
    </div>
  );
}

type PlusSortSelectorProps = {
  selectedSort?: string;
  setSelectedSort: (sort: string | undefined) => void;
};
function PlusSortSelector({
  selectedSort,
  setSelectedSort,
}: PlusSortSelectorProps) {
  // menu state

  const [open, setOpen] = useState(false);

  // sort

  const [currentSort, setCurrentSort] = useState<string>();
  const [currentDir, setCurrentDir] = useState<string>("desc");

  // components

  const Sort = selectedSort
    ? selectedSort.split("_")[1] == "desc"
      ? FaSortAmountDown
      : FaSortAmountUp
    : FaSort;
  const Menu = isMobile ? Drawer : DropdownMenu;
  const Trigger = isMobile ? DrawerTrigger : DropdownMenuTrigger;
  const Content = isMobile ? DrawerContent : DropdownMenuContent;

  return (
    <div className="flex h-full items-center justify-start gap-2">
      <Menu
        open={open}
        onOpenChange={(open) => {
          setOpen(open);

          if (!open) {
            const parts = selectedSort?.split("_");

            if (parts?.length == 2) {
              setCurrentSort(parts[0]);
              setCurrentDir(parts[1]);
            }
          }
        }}
      >
        <Trigger asChild>
          <Button
            className="flex items-center gap-2 capitalize"
            size="sm"
            variant={selectedSort == undefined ? "default" : "select"}
          >
            <Sort
              className={`${selectedSort == undefined ? "text-secondary-foreground" : "text-selected-foreground"}`}
            />
            <div className="hidden text-primary md:block">
              {selectedSort == undefined ? "Sort" : selectedSort.split("_")[0]}
            </div>
          </Button>
        </Trigger>
        <Content
          className={`flex flex-col justify-center gap-2 p-2 ${isMobile ? "max-h-[75dvh]" : ""}`}
        >
          <RadioGroup
            className={`flex flex-col gap-4 ${isMobile ? "mt-4" : ""}`}
            onValueChange={(value) => setCurrentSort(value)}
          >
            <div className="flex w-full items-center gap-2">
              <RadioGroupItem
                className={
                  currentSort == "date"
                    ? "bg-selected from-selected/50 to-selected/90 text-selected"
                    : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                }
                id="date"
                value="date"
              />
              <Label
                className="w-full cursor-pointer capitalize"
                htmlFor="date"
              >
                Date
              </Label>
              {currentSort == "date" ? (
                currentDir == "desc" ? (
                  <FaSortAmountDown
                    className="size-5 cursor-pointer"
                    onClick={() => setCurrentDir("asc")}
                  />
                ) : (
                  <FaSortAmountUp
                    className="size-5 cursor-pointer"
                    onClick={() => setCurrentDir("desc")}
                  />
                )
              ) : (
                <div className="size-5" />
              )}
            </div>
            <div className="flex w-full items-center gap-2">
              <RadioGroupItem
                className={
                  currentSort == "score"
                    ? "bg-selected from-selected/50 to-selected/90 text-selected"
                    : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                }
                id="score"
                value="score"
              />
              <Label
                className="w-full cursor-pointer capitalize"
                htmlFor="score"
              >
                Score
              </Label>
              {currentSort == "score" ? (
                currentDir == "desc" ? (
                  <FaSortAmountDown
                    className="size-5 cursor-pointer"
                    onClick={() => setCurrentDir("asc")}
                  />
                ) : (
                  <FaSortAmountUp
                    className="size-5 cursor-pointer"
                    onClick={() => setCurrentDir("desc")}
                  />
                )
              ) : (
                <div className="size-5" />
              )}
            </div>
          </RadioGroup>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-evenly p-2">
            <Button
              variant="select"
              disabled={!currentSort}
              onClick={() => {
                if (currentSort) {
                  setSelectedSort(`${currentSort}_${currentDir}`);
                  setOpen(false);
                }
              }}
            >
              Apply
            </Button>
            <Button
              onClick={() => {
                setCurrentSort(undefined);
                setCurrentDir("desc");
                setSelectedSort(undefined);
              }}
            >
              Reset
            </Button>
          </div>
        </Content>
      </Menu>
    </div>
  );
}
