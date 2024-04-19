import { Polygon } from "@/types/canvas";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { MdOutlineRestartAlt, MdUndo } from "react-icons/md";
import { Button } from "../ui/button";

type PolygonEditControlsProps = {
  polygons: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex: number | undefined;
};

export default function PolygonEditControls({
  polygons,
  setPolygons,
  activePolygonIndex,
}: PolygonEditControlsProps) {
  const undo = () => {
    if (activePolygonIndex === undefined || !polygons) {
      return;
    }

    const updatedPolygons = [...polygons];
    const activePolygon = updatedPolygons[activePolygonIndex];

    if (
      activePolygon.points.length > 0 &&
      activePolygon.pointsOrder &&
      activePolygon.pointsOrder.length > 0
    ) {
      const lastPointOrderIndex = activePolygon.pointsOrder.indexOf(
        Math.max(...activePolygon.pointsOrder),
      );

      updatedPolygons[activePolygonIndex] = {
        ...activePolygon,
        points: [
          ...activePolygon.points.slice(0, lastPointOrderIndex),
          ...activePolygon.points.slice(lastPointOrderIndex + 1),
        ],
        pointsOrder: [
          ...activePolygon.pointsOrder.slice(0, lastPointOrderIndex),
          ...activePolygon.pointsOrder.slice(lastPointOrderIndex + 1),
        ],
        isFinished: false,
      };

      setPolygons(updatedPolygons);
    }
  };

  const reset = () => {
    if (activePolygonIndex === undefined || !polygons) {
      return;
    }

    const updatedPolygons = [...polygons];
    const activePolygon = updatedPolygons[activePolygonIndex];
    updatedPolygons[activePolygonIndex] = {
      ...activePolygon,
      points: [],
      isFinished: false,
    };
    setPolygons(updatedPolygons);
  };

  if (activePolygonIndex === undefined || !polygons) {
    return;
  }

  return (
    <div className="flex flex-row justify-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            className="size-6 p-1 rounded-md"
            disabled={!polygons[activePolygonIndex].points.length}
            onClick={undo}
          >
            <MdUndo className="text-secondary-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            className="size-6 p-1 rounded-md"
            disabled={!polygons[activePolygonIndex].points.length}
            onClick={reset}
          >
            <MdOutlineRestartAlt className="text-secondary-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset</TooltipContent>
      </Tooltip>
    </div>
  );
}
