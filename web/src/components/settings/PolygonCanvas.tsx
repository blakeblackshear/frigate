import React, { useMemo, useRef, useState, useEffect } from "react";
import PolygonDrawer from "./PolygonDrawer";
import { Stage, Layer, Image } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Polygon, PolygonType } from "@/types/canvas";
import { useApiHost } from "@/api";

type PolygonCanvasProps = {
  camera: string;
  width: number;
  height: number;
  polygons: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex: number | undefined;
  hoveredPolygonIndex: number | null;
  selectedZoneMask: PolygonType[] | undefined;
};

export function PolygonCanvas({
  camera,
  width,
  height,
  polygons,
  setPolygons,
  activePolygonIndex,
  hoveredPolygonIndex,
  selectedZoneMask,
}: PolygonCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | undefined>();
  const imageRef = useRef<Konva.Image | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const apiHost = useApiHost();

  const videoElement = useMemo(() => {
    if (camera && width && height) {
      const element = new window.Image();
      element.width = width;
      element.height = height;
      element.src = `${apiHost}api/${camera}/latest.jpg`;
      return element;
    }
  }, [camera, width, height, apiHost]);

  useEffect(() => {
    if (!videoElement) {
      return;
    }
    const onload = function () {
      setImage(videoElement);
    };
    videoElement.addEventListener("load", onload);
    return () => {
      videoElement.removeEventListener("load", onload);
    };
  }, [videoElement]);

  const getMousePos = (stage: Konva.Stage) => {
    return [stage.getPointerPosition()!.x, stage.getPointerPosition()!.y];
  };

  const addPointToPolygon = (polygon: Polygon, newPoint: number[]) => {
    const points = polygon.points;
    const pointsOrder = polygon.pointsOrder;

    const [newPointX, newPointY] = newPoint;
    const updatedPoints = [...points];

    let updatedPointsOrder: number[];
    if (!pointsOrder) {
      updatedPointsOrder = [];
    } else {
      updatedPointsOrder = [...pointsOrder];
    }

    let insertIndex = points.length;

    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = i === points.length - 1 ? points[0] : points[i + 1];

      if (
        (x1 <= newPointX && newPointX <= x2) ||
        (x2 <= newPointX && newPointX <= x1)
      ) {
        if (
          (y1 <= newPointY && newPointY <= y2) ||
          (y2 <= newPointY && newPointY <= y1)
        ) {
          insertIndex = i + 1;
          break;
        }
      }
    }

    updatedPoints.splice(insertIndex, 0, [newPointX, newPointY]);
    updatedPointsOrder.splice(insertIndex, 0, updatedPoints.length);

    return { updatedPoints, updatedPointsOrder };
  };

  const isMouseOverFirstPoint = (polygon: Polygon, mousePos: number[]) => {
    if (!polygon || !polygon.points || polygon.points.length < 1) {
      return false;
    }
    const [firstPoint] = polygon.points;
    const distance = Math.hypot(
      mousePos[0] - firstPoint[0],
      mousePos[1] - firstPoint[1],
    );
    return distance < 10;
  };

  const isMouseOverAnyPoint = (polygon: Polygon, mousePos: number[]) => {
    if (!polygon || !polygon.points || polygon.points.length === 0) {
      return false;
    }

    for (let i = 1; i < polygon.points.length; i++) {
      const point = polygon.points[i];
      const distance = Math.hypot(
        mousePos[0] - point[0],
        mousePos[1] - point[1],
      );
      if (distance < 10) {
        return true;
      }
    }

    return false;
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (activePolygonIndex === undefined || !polygons) {
      return;
    }

    const updatedPolygons = [...polygons];
    const activePolygon = updatedPolygons[activePolygonIndex];
    const stage = e.target.getStage()!;
    const mousePos = getMousePos(stage);

    if (
      activePolygon.points.length >= 3 &&
      isMouseOverFirstPoint(activePolygon, mousePos)
    ) {
      // Close the polygon
      updatedPolygons[activePolygonIndex] = {
        ...activePolygon,
        isFinished: true,
      };
      setPolygons(updatedPolygons);
    } else {
      if (
        !activePolygon.isFinished &&
        !isMouseOverAnyPoint(activePolygon, mousePos)
      ) {
        const { updatedPoints, updatedPointsOrder } = addPointToPolygon(
          activePolygon,
          mousePos,
        );

        updatedPolygons[activePolygonIndex] = {
          ...activePolygon,
          points: updatedPoints,
          pointsOrder: updatedPointsOrder,
        };
        setPolygons(updatedPolygons);
      }
    }
    // }
  };

  const handleMouseOverStartPoint = (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (activePolygonIndex === undefined || !polygons) {
      return;
    }

    const activePolygon = polygons[activePolygonIndex];
    if (!activePolygon.isFinished && activePolygon.points.length >= 3) {
      e.target.getStage()!.container().style.cursor = "default";
      e.currentTarget.scale({ x: 2, y: 2 });
    }
  };

  const handleMouseOutStartPoint = (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    e.currentTarget.scale({ x: 1, y: 1 });

    if (activePolygonIndex === undefined || !polygons) {
      return;
    }

    const activePolygon = polygons[activePolygonIndex];
    if (
      (!activePolygon.isFinished && activePolygon.points.length >= 3) ||
      activePolygon.isFinished
    ) {
      e.currentTarget.scale({ x: 1, y: 1 });
    }
  };

  const handleMouseOverAnyPoint = (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (!polygons) {
      return;
    }
    e.target.getStage()!.container().style.cursor = "move";
  };

  const handleMouseOutAnyPoint = (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (activePolygonIndex === undefined || !polygons) {
      return;
    }
    const activePolygon = polygons[activePolygonIndex];
    if (activePolygon.isFinished) {
      e.target.getStage()!.container().style.cursor = "default";
    } else {
      e.target.getStage()!.container().style.cursor = "crosshair";
    }
  };

  const handlePointDragMove = (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (activePolygonIndex === undefined || !polygons) {
      return;
    }

    const updatedPolygons = [...polygons];
    const activePolygon = updatedPolygons[activePolygonIndex];
    const stage = e.target.getStage();
    if (stage) {
      const index = e.target.index - 1;
      const pos = [e.target._lastPos!.x, e.target._lastPos!.y];
      if (pos[0] < 0) pos[0] = 0;
      if (pos[1] < 0) pos[1] = 0;
      if (pos[0] > stage.width()) pos[0] = stage.width();
      if (pos[1] > stage.height()) pos[1] = stage.height();
      updatedPolygons[activePolygonIndex] = {
        ...activePolygon,
        points: [
          ...activePolygon.points.slice(0, index),
          pos,
          ...activePolygon.points.slice(index + 1),
        ],
      };
      setPolygons(updatedPolygons);
    }
  };

  const handleGroupDragEnd = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (activePolygonIndex !== undefined && e.target.name() === "polygon") {
      const updatedPolygons = [...polygons];
      const activePolygon = updatedPolygons[activePolygonIndex];
      const result: number[][] = [];
      activePolygon.points.map((point: number[]) =>
        result.push([point[0] + e.target.x(), point[1] + e.target.y()]),
      );
      e.target.position({ x: 0, y: 0 });
      updatedPolygons[activePolygonIndex] = {
        ...activePolygon,
        points: result,
      };
      setPolygons(updatedPolygons);
    }
  };

  const handleStageMouseOver = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (activePolygonIndex === undefined || !polygons) {
      return;
    }

    const updatedPolygons = [...polygons];
    const activePolygon = updatedPolygons[activePolygonIndex];
    const stage = e.target.getStage()!;
    const mousePos = getMousePos(stage);

    if (
      activePolygon.isFinished ||
      isMouseOverAnyPoint(activePolygon, mousePos) ||
      isMouseOverFirstPoint(activePolygon, mousePos)
    )
      return;

    e.target.getStage()!.container().style.cursor = "crosshair";
  };

  useEffect(() => {
    if (activePolygonIndex === undefined || !polygons) {
      return;
    }

    const updatedPolygons = [...polygons];
    const activePolygon = updatedPolygons[activePolygonIndex];

    // add default points order for already completed polygons
    if (!activePolygon.pointsOrder && activePolygon.isFinished) {
      updatedPolygons[activePolygonIndex] = {
        ...activePolygon,
        pointsOrder: activePolygon.points.map((_, index) => index),
      };
      setPolygons(updatedPolygons);
    }
  }, [activePolygonIndex, polygons, setPolygons]);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onMouseOver={handleStageMouseOver}
    >
      <Layer>
        <Image
          ref={imageRef}
          image={image}
          x={0}
          y={0}
          width={width}
          height={height}
        />
        {polygons?.map(
          (polygon, index) =>
            (selectedZoneMask === undefined ||
              selectedZoneMask.includes(polygon.type)) &&
            index !== activePolygonIndex && (
              <PolygonDrawer
                key={index}
                points={polygon.points}
                isActive={index === activePolygonIndex}
                isHovered={index === hoveredPolygonIndex}
                isFinished={polygon.isFinished}
                color={polygon.color}
                handlePointDragMove={handlePointDragMove}
                handleGroupDragEnd={handleGroupDragEnd}
                handleMouseOverStartPoint={handleMouseOverStartPoint}
                handleMouseOutStartPoint={handleMouseOutStartPoint}
                handleMouseOverAnyPoint={handleMouseOverAnyPoint}
                handleMouseOutAnyPoint={handleMouseOutAnyPoint}
              />
            ),
        )}
        {activePolygonIndex !== undefined &&
          polygons?.[activePolygonIndex] &&
          (selectedZoneMask === undefined ||
            selectedZoneMask.includes(polygons[activePolygonIndex].type)) && (
            <PolygonDrawer
              key={activePolygonIndex}
              points={polygons[activePolygonIndex].points}
              isActive={true}
              isHovered={activePolygonIndex === hoveredPolygonIndex}
              isFinished={polygons[activePolygonIndex].isFinished}
              color={polygons[activePolygonIndex].color}
              handlePointDragMove={handlePointDragMove}
              handleGroupDragEnd={handleGroupDragEnd}
              handleMouseOverStartPoint={handleMouseOverStartPoint}
              handleMouseOutStartPoint={handleMouseOutStartPoint}
              handleMouseOverAnyPoint={handleMouseOverAnyPoint}
              handleMouseOutAnyPoint={handleMouseOutAnyPoint}
            />
          )}
      </Layer>
    </Stage>
  );
}

export default PolygonCanvas;
