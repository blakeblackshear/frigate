import { Button } from "../ui/button";
import { Polygon } from "@/types/canvas";

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
      };
      setPolygons(updatedPolygons);
    }
  };

  const handleNewPolygon = () => {
    setPolygons([
      ...(polygons || []),
      {
        points: [],
        isFinished: false,
        name: "new",
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
        <Button variant="secondary" onClick={handleNewPolygon}>
          New Polygon
        </Button>
      </div>
    </div>
  );
}

export default PolygonControls;
