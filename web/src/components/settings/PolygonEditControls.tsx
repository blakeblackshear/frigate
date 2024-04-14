import { Polygon } from "@/types/canvas";
import { Button } from "../ui/button";

type PolygonEditControlsProps = {
  polygons: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex: number | null;
};

export default function PolygonEditControls({
  polygons,
  setPolygons,
  activePolygonIndex,
}: PolygonEditControlsProps) {
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
        ...updatedPolygons[activePolygonIndex],
        points: [],
      };
      setPolygons(updatedPolygons);
    }
  };

  return (
    <div className="flex">
      <Button className="mr-5" variant="secondary" onClick={undo}>
        Undo
      </Button>
      <Button variant="secondary" onClick={reset}>
        Reset
      </Button>
    </div>
  );
}
