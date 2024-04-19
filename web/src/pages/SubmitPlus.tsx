import { baseUrl } from "@/api/baseUrl";
import {
  CamerasFilterButton,
  GeneralFilterContent,
} from "@/components/filter/ReviewFilterGroup";
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
import { Event } from "@/types/event";
import { ATTRIBUTE_LABELS, FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import {
  FaList,
  FaSort,
  FaSortAmountDown,
  FaSortAmountUp,
} from "react-icons/fa";
import { PiSlidersHorizontalFill } from "react-icons/pi";
import useSWR from "swr";

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

  const { data: events, mutate: refresh } = useSWR<Event[]>([
    "events",
    {
      limit: 100,
      in_progress: 0,
      is_submitted: 0,
      cameras: selectedCameras ? selectedCameras.join(",") : null,
      labels: selectedLabels ? selectedLabels.join(",") : null,
      min_score: scoreRange ? scoreRange[0] : null,
      max_score: scoreRange ? scoreRange[1] : null,
      sort: sort ? sort : null,
    },
  ]);
  const [upload, setUpload] = useState<Event>();

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
        (data: Event[] | undefined) => {
          if (!data) {
            return data;
          }

          const index = data.findIndex((e) => e.id == upload.id);

          if (index == -1) {
            return data;
          }

          return [...data.slice(0, index), ...data.slice(index + 1)];
        },
        { revalidate: false, populateCache: true },
      );
      setUpload(undefined);
    },
    [refresh, upload],
  );

  return (
    <div className="size-full flex flex-col">
      <div className="w-full h-16 px-2 flex items-center justify-between overflow-x-auto">
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
      <div className="size-full flex flex-1 flex-wrap content-start gap-2 md:gap-4 overflow-y-auto no-scrollbar">
        <div className="w-full p-2 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          <Dialog
            open={upload != undefined}
            onOpenChange={(open) => (!open ? setUpload(undefined) : null)}
          >
            <DialogContent className="md:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Submit To Frigate+</DialogTitle>
                <DialogDescription>
                  Objects in locations you want to avoid are not false
                  positives. Submitting them as false positives will confuse the
                  model.
                </DialogDescription>
              </DialogHeader>
              <img
                className={`w-full ${grow} bg-black`}
                src={`${baseUrl}api/events/${upload?.id}/snapshot.jpg`}
                alt={`${upload?.label}`}
              />
              <DialogFooter>
                <Button onClick={() => setUpload(undefined)}>Cancel</Button>
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
            </DialogContent>
          </Dialog>

          {events?.map((event) => {
            if (event.data.type != "object") {
              return;
            }

            return (
              <div
                key={event.id}
                className="w-full rounded-2xl aspect-video flex justify-center items-center bg-black cursor-pointer"
                onClick={() => setUpload(event)}
              >
                <img
                  className="aspect-video h-full object-contain rounded-2xl"
                  src={`${baseUrl}api/events/${event.id}/snapshot.jpg`}
                  loading="lazy"
                />
              </div>
            );
          })}
        </div>
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
    <div className="h-full flex justify-start gap-2 items-center">
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
            <div className="hidden md:block text-primary">
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
            <div className="hidden md:block text-primary">
              {selectedScoreRange == undefined
                ? "Score Range"
                : `${selectedScoreRange[0] * 100}% - ${selectedScoreRange[1] * 100}%`}
            </div>
          </Button>
        </Trigger>
        <Content
          className={`min-w-80 p-2 flex flex-col justify-center ${isMobile ? "gap-2 *:max-h-[75dvh]" : ""}`}
        >
          <div className="flex items-center gap-1">
            <Input
              className="w-12"
              inputMode="numeric"
              value={Math.round((currentScoreRange?.at(0) ?? 0.5) * 100)}
              onChange={(e) =>
                setCurrentScoreRange([
                  parseInt(e.target.value) / 100.0,
                  currentScoreRange?.at(1) ?? 1.0,
                ])
              }
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
              onChange={(e) =>
                setCurrentScoreRange([
                  currentScoreRange?.at(0) ?? 0.5,
                  parseInt(e.target.value) / 100.0,
                ])
              }
            />
          </div>
          <DropdownMenuSeparator />
          <div className="p-2 flex justify-evenly items-center">
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
    <div className="h-full flex justify-start gap-2 items-center">
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
            <div className="hidden md:block text-primary">
              {selectedSort == undefined ? "Sort" : selectedSort.split("_")[0]}
            </div>
          </Button>
        </Trigger>
        <Content
          className={`p-2 flex flex-col justify-center gap-2 ${isMobile ? "max-h-[75dvh]" : ""}`}
        >
          <RadioGroup
            className={`flex flex-col gap-4 ${isMobile ? "mt-4" : ""}`}
            onValueChange={(value) => setCurrentSort(value)}
          >
            <div className="w-full flex items-center gap-2">
              <RadioGroupItem
                className={
                  currentSort == "date"
                    ? "from-selected/50 to-selected/90 text-selected bg-selected"
                    : "from-secondary/50 to-secondary/90 text-secondary bg-secondary"
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
            <div className="w-full flex items-center gap-2">
              <RadioGroupItem
                className={
                  currentSort == "score"
                    ? "from-selected/50 to-selected/90 text-selected bg-selected"
                    : "from-secondary/50 to-secondary/90 text-secondary bg-secondary"
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
          <div className="p-2 flex justify-evenly items-center">
            <Button
              variant="select"
              onClick={() => {
                setSelectedSort(`${currentSort}_${currentDir}`);
                setOpen(false);
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
