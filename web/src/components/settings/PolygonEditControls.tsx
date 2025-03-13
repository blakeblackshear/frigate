import { Polygon } from "@/types/canvas";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { MdOutlineRestartAlt, MdUndo } from "react-icons/md";
import { Button } from "../ui/button";
import { TbPolygon, TbPolygonOff } from "react-icons/tb";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type PolygonEditControlsProps = {
  polygons: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex: number | undefined;
  snapPoints: boolean;
  setSnapPoints: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function PolygonEditControls({
  polygons,
  setPolygons,
  activePolygonIndex,
  snapPoints,
  setSnapPoints,
}: PolygonEditControlsProps) {
  const { t } = useTranslation(["views/settings"]);
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
        isFinished: activePolygon.isFinished && activePolygon.points.length > 3,
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
            className="size-6 rounded-md p-1"
            aria-label={t("masksAndZones.form.polygonDrawing.removeLastPoint")}
            disabled={!polygons[activePolygonIndex].points.length}
            onClick={undo}
          >
            <MdUndo className="text-secondary-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t("masksAndZones.form.polygonDrawing.removeLastPoint")}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            className="size-6 rounded-md p-1"
            aria-label={t("masksAndZones.form.polygonDrawing.reset.label")}
            disabled={!polygons[activePolygonIndex].points.length}
            onClick={reset}
          >
            <MdOutlineRestartAlt className="text-secondary-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("button.reset", { ns: "common" })}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={snapPoints ? "select" : "default"}
            className={cn("size-6 rounded-md p-1")}
            aria-label={t("masksAndZones.form.polygonDrawing.snapPoints.true")}
            onClick={() => setSnapPoints((prev) => !prev)}
          >
            {snapPoints ? (
              <TbPolygon className="text-primary" />
            ) : (
              <TbPolygonOff className="text-secondary-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {snapPoints
            ? t("masksAndZones.form.polygonDrawing.snapPoints.false")
            : t("masksAndZones.form.polygonDrawing.snapPoints.true")}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
