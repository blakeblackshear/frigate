import { baseUrl } from "@/api/baseUrl";
import FilterCheckBox from "@/components/filter/FilterCheckBox";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Event } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import { FaList, FaVideo } from "react-icons/fa";
import useSWR from "swr";

export default function SubmitPlus() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // filters

  const [selectedCameras, setSelectedCameras] = useState<string[]>();
  const [selectedLabels, setSelectedLabels] = useState<string[]>();

  // data

  const { data: events, mutate: refresh } = useSWR<Event[]>([
    "events",
    {
      limit: 100,
      in_progress: 0,
      is_submitted: 0,
      cameras: selectedCameras ? selectedCameras.join(",") : null,
      labels: selectedLabels ? selectedLabels.join(",") : null,
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
      <PlusFilterGroup
        selectedCameras={selectedCameras}
        setSelectedCameras={setSelectedCameras}
        selectedLabels={selectedLabels}
        setSelectedLabels={setSelectedLabels}
      />
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

const ATTRIBUTES = ["amazon", "face", "fedex", "license_plate", "ups"];

type PlusFilterGroupProps = {
  selectedCameras: string[] | undefined;
  setSelectedCameras: (cameras: string[] | undefined) => void;
  selectedLabels: string[] | undefined;
  setSelectedLabels: (cameras: string[] | undefined) => void;
};
function PlusFilterGroup({
  selectedCameras,
  setSelectedCameras,
  selectedLabels,
  setSelectedLabels,
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
        if (!ATTRIBUTES.includes(label)) {
          labels.add(label);
        }
      });
    });

    return [...labels].sort();
  }, [config, selectedCameras]);

  const [open, setOpen] = useState<"none" | "camera" | "label">("none");
  const [currentCameras, setCurrentCameras] = useState<string[] | undefined>(
    undefined,
  );
  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    undefined,
  );

  const Menu = isMobile ? Drawer : DropdownMenu;
  const Trigger = isMobile ? DrawerTrigger : DropdownMenuTrigger;
  const Content = isMobile ? DrawerContent : DropdownMenuContent;

  return (
    <div className="w-full h-16 flex justify-start gap-2 items-center">
      <Menu
        open={open == "camera"}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentCameras(selectedCameras);
          }
          setOpen(open ? "camera" : "none");
        }}
      >
        <Trigger asChild>
          <Button size="sm" className="mx-1 capitalize" variant="secondary">
            <FaVideo className="md:mr-[10px] text-muted-foreground" />
            <div className="hidden md:block">
              {selectedCameras == undefined
                ? "All Cameras"
                : `${selectedCameras.length} Cameras`}
            </div>
          </Button>
        </Trigger>
        <Content className={isMobile ? "max-h-[75dvh]" : ""}>
          <DropdownMenuLabel className="flex justify-center">
            Filter Cameras
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <FilterCheckBox
            isChecked={currentCameras == undefined}
            label="All Cameras"
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                setCurrentCameras(undefined);
              }
            }}
          />
          <DropdownMenuSeparator />
          <div className={isMobile ? "h-auto overflow-y-auto" : ""}>
            {allCameras.map((item) => (
              <FilterCheckBox
                key={item}
                isChecked={currentCameras?.includes(item) ?? false}
                label={item.replaceAll("_", " ")}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    const updatedCameras = currentCameras
                      ? [...currentCameras]
                      : [];

                    updatedCameras.push(item);
                    setCurrentCameras(updatedCameras);
                  } else {
                    const updatedCameras = currentCameras
                      ? [...currentCameras]
                      : [];

                    // can not deselect the last item
                    if (updatedCameras.length > 1) {
                      updatedCameras.splice(updatedCameras.indexOf(item), 1);
                      setCurrentCameras(updatedCameras);
                    }
                  }
                }}
              />
            ))}
          </div>
          <DropdownMenuSeparator />
          <div className="flex justify-center items-center">
            <Button
              variant="select"
              onClick={() => {
                setSelectedCameras(currentCameras);
                setOpen("none");
              }}
            >
              Apply
            </Button>
          </div>
        </Content>
      </Menu>
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
          <Button size="sm" className="mx-1 capitalize" variant="secondary">
            <FaList className="md:mr-[10px] text-muted-foreground" />
            <div className="hidden md:block">
              {selectedLabels == undefined
                ? "All Labels"
                : `${selectedLabels.length} Labels`}
            </div>
          </Button>
        </Trigger>
        <Content className={isMobile ? "max-h-[75dvh]" : ""}>
          <DropdownMenuLabel className="flex justify-center">
            Filter Labels
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <FilterCheckBox
            isChecked={currentLabels == undefined}
            label="All Labels"
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                setCurrentLabels(undefined);
              }
            }}
          />
          <DropdownMenuSeparator />
          <div className={isMobile ? "h-auto overflow-y-auto" : ""}>
            {allLabels.map((item) => (
              <FilterCheckBox
                key={item}
                isChecked={currentLabels?.includes(item) ?? false}
                label={item.replaceAll("_", " ")}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    const updatedLabels = currentLabels
                      ? [...currentLabels]
                      : [];

                    updatedLabels.push(item);
                    setCurrentLabels(updatedLabels);
                  } else {
                    const updatedLabels = currentLabels
                      ? [...currentLabels]
                      : [];

                    // can not deselect the last item
                    if (updatedLabels.length > 1) {
                      updatedLabels.splice(updatedLabels.indexOf(item), 1);
                      setCurrentLabels(updatedLabels);
                    }
                  }
                }}
              />
            ))}
          </div>
          <DropdownMenuSeparator />
          <div className="flex justify-center items-center">
            <Button
              variant="select"
              onClick={() => {
                setSelectedLabels(currentLabels);
                setOpen("none");
              }}
            >
              Apply
            </Button>
          </div>
        </Content>
      </Menu>
    </div>
  );
}
