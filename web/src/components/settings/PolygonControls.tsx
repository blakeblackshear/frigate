import { Button } from "../ui/button";
import { Polygon } from "@/types/canvas";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "../ui/input";
import useSWR from "swr";

type PolygonCanvasProps = {
  camera: string;
  width: number;
  height: number;
  polygons: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex: number | null;
  setActivePolygonIndex: React.Dispatch<React.SetStateAction<number | null>>;
};

export function PolygonControls({
  polygons,
  setPolygons,
  activePolygonIndex,
  setActivePolygonIndex,
}: PolygonCanvasProps) {
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
        name: "new",
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
            <DialogTitle>New Zone</DialogTitle>
            <>
              <Input
                className="mt-3"
                type="search"
                value={zoneName ?? ""}
                onChange={(e) => {
                  setInvalidName(
                    Object.keys(config.cameras).includes(e.target.value),
                  );

                  setZoneName(e.target.value);
                }}
              />
              {invalidName && (
                <div className="text-danger text-sm">
                  Zone names must not be the name of a camera.
                </div>
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

export default PolygonControls;
