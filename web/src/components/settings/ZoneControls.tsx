import { Polygon } from "@/types/canvas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { useMemo, useState } from "react";
import { Input } from "../ui/input";
import { GeneralFilterContent } from "../filter/ReviewFilterGroup";
import { FaObjectGroup } from "react-icons/fa";
import { Button } from "../ui/button";
import { ATTRIBUTES, FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { isMobile } from "react-device-detect";

type ZoneObjectSelectorProps = {
  camera: string;
  zoneName: string;
  allLabels: string[];
  updateLabelFilter: (labels: string[] | undefined) => void;
};

export function ZoneObjectSelector({
  camera,
  zoneName,
  allLabels,
  updateLabelFilter,
}: ZoneObjectSelectorProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [open, setOpen] = useState(false);

  const cameraConfig = useMemo(() => {
    if (config && camera) {
      return config.cameras[camera];
    }
  }, [config, camera]);

  const zoneLabels = useMemo<string[]>(() => {
    if (!cameraConfig || !zoneName) {
      return [];
    }

    const labels = new Set<string>();

    cameraConfig.objects.track.forEach((label) => {
      if (!ATTRIBUTES.includes(label)) {
        labels.add(label);
      }
    });

    if (cameraConfig.zones[zoneName]) {
      cameraConfig.zones[zoneName].objects.forEach((label) => {
        if (!ATTRIBUTES.includes(label)) {
          labels.add(label);
        }
      });
    }

    return [...labels].sort() || [];
  }, [cameraConfig, zoneName]);

  const [currentLabels, setCurrentLabels] = useState<string[] | undefined>(
    zoneLabels,
  );

  const trigger = (
    <Button
      className={`flex items-center gap-2 capitalize ${false ? "bg-selected hover:bg-selected" : ""}`}
      size="sm"
    >
      <FaObjectGroup
        className={`${false ? "text-background dark:text-primary" : "text-secondary-foreground"}`}
      />
    </Button>
  );

  const content = (
    <GeneralFilterContent
      allLabels={allLabels}
      selectedLabels={zoneLabels}
      currentLabels={currentLabels}
      updateLabelFilter={updateLabelFilter}
      setCurrentLabels={setCurrentLabels}
      onClose={() => setOpen(false)}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentLabels(zoneLabels);
          }

          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setCurrentLabels(zoneLabels);
        }

        setOpen(open);
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent>{content}</PopoverContent>
    </Popover>
  );
}

type ZoneControlsProps = {
  camera: string;
  polygons: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex: number | null;
  setActivePolygonIndex: React.Dispatch<React.SetStateAction<number | null>>;
};

export function ZoneControls({
  camera,
  polygons,
  setPolygons,
  activePolygonIndex,
  setActivePolygonIndex,
}: ZoneControlsProps) {
  const { data: config } = useSWR("config");
  const [zoneName, setZoneName] = useState<string | null>();
  const [invalidName, setInvalidName] = useState<boolean>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const undo = () => {
    if (activePolygonIndex !== null && polygons) {
      const updatedPolygons = [...polygons];
      const activePolygon = updatedPolygons[activePolygonIndex];
      if (activePolygon.points.length > 0) {
        updatedPolygons[activePolygonIndex] = {
          ...activePolygon,
          points: activePolygon.points.slice(0, -1),
          isFinished: false,
        };
        setPolygons(updatedPolygons);
      }
    }
  };

  const reset = () => {
    if (activePolygonIndex !== null) {
      const updatedPolygons = [...polygons];
      updatedPolygons[activePolygonIndex] = {
        points: [],
        isFinished: false,
        name: updatedPolygons[activePolygonIndex].name,
        camera: camera,
        color: updatedPolygons[activePolygonIndex].color ?? [220, 0, 0],
      };
      setPolygons(updatedPolygons);
    }
  };

  const handleNewPolygon = (zoneName: string) => {
    setPolygons([
      ...(polygons || []),
      {
        points: [],
        isFinished: false,
        name: zoneName,
        camera: camera,
        color: [220, 0, 0],
      },
    ]);
    setActivePolygonIndex(polygons.length);
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center my-5">
        <Button className="mr-5" variant="secondary" onClick={undo}>
          Undo
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>
          New Zone
        </Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setZoneName("");
            }
          }}
        >
          <DialogContent>
            {isMobile && <span tabIndex={0} className="sr-only" />}
            <DialogTitle>New Zone</DialogTitle>
            <DialogDescription>
              Enter a unique label for your zone. Do not include spaces, and
              don't use the name of a camera.
            </DialogDescription>
            <>
              <Input
                className={`mt-3 ${isMobile && "text-md"}`}
                type="search"
                value={zoneName ?? ""}
                onChange={(e) => {
                  setInvalidName(
                    Object.keys(config.cameras).includes(e.target.value) ||
                      e.target.value.includes(" ") ||
                      polygons
                        .map((item) => item.name)
                        .includes(e.target.value),
                  );

                  setZoneName(e.target.value);
                }}
              />
              {invalidName && (
                <div className="text-danger text-sm">Invalid zone name.</div>
              )}
              <DialogFooter>
                <Button
                  size="sm"
                  variant="select"
                  disabled={invalidName || (zoneName?.length ?? 0) == 0}
                  onClick={() => {
                    if (zoneName) {
                      setDialogOpen(false);
                      handleNewPolygon(zoneName);
                    }
                    setZoneName(null);
                  }}
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default ZoneControls;
