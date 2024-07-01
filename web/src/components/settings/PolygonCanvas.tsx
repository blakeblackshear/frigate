import React, { useMemo, useRef, useState, useEffect, RefObject } from "react";
import PolygonDrawer from "./PolygonDrawer";
import { Stage, Layer, Image } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Polygon, PolygonType } from "@/types/canvas";
import { useApiHost } from "@/api";

type PolygonCanvasProps = {
  containerRef: RefObject<HTMLDivElement>;
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
  containerRef,
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
      element.src = `${apiHost}api/${camera}/latest.webp?cache=${Date.now()}`;
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

  const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (activePolygonIndex === undefined || !polygons) {
      return;
    }

    const updatedPolygons = [...polygons];
    const activePolygon = updatedPolygons[activePolygonIndex];
    const stage = e.target.getStage()!;
    const mousePos = stage.getPointerPosition() ?? { x: 0, y: 0 };
    const intersection = stage.getIntersection(mousePos);

    if (
      activePolygon.points.length >= 3 &&
      intersection?.getClassName() == "Circle" &&
      intersection?.name() == "point-0"
    ) {
      // Close the polygon
      updatedPolygons[activePolygonIndex] = {
        ...activePolygon,
        isFinished: true,
      };
      setPolygons(updatedPolygons);
    } else {
      if (
        (!activePolygon.isFinished &&
          intersection?.getClassName() !== "Circle") ||
        (activePolygon.isFinished && intersection?.name() == "unfilled-line")
      ) {
        const { updatedPoints, updatedPointsOrder } = addPointToPolygon(
          activePolygon,
          [mousePos.x, mousePos.y],
        );

        updatedPolygons[activePolygonIndex] = {
          ...activePolygon,
          points: updatedPoints,
          pointsOrder: updatedPointsOrder,
        };
        setPolygons(updatedPolygons);
      }
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
      // we add an unfilled line for adding points when finished
      const index = e.target.index - (activePolygon.isFinished ? 2 : 1);
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

  const handleStageMouseOver = () => {
    if (activePolygonIndex === undefined || !polygons) {
      return;
    }

    const updatedPolygons = [...polygons];
    const activePolygon = updatedPolygons[activePolygonIndex];

    if (containerRef.current && !activePolygon.isFinished) {
      containerRef.current.style.cursor = "crosshair";
    }
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
                stageRef={stageRef}
                key={index}
                points={polygon.points}
                isActive={index === activePolygonIndex}
                isHovered={index === hoveredPolygonIndex}
                isFinished={polygon.isFinished}
                color={polygon.color}
                handlePointDragMove={handlePointDragMove}
                handleGroupDragEnd={handleGroupDragEnd}
              />
            ),
        )}
        {activePolygonIndex !== undefined &&
          polygons?.[activePolygonIndex] &&
          (selectedZoneMask === undefined ||
            selectedZoneMask.includes(polygons[activePolygonIndex].type)) && (
            <PolygonDrawer
              stageRef={stageRef}
              key={activePolygonIndex}
              points={polygons[activePolygonIndex].points}
              isActive={true}
              isHovered={activePolygonIndex === hoveredPolygonIndex}
              isFinished={polygons[activePolygonIndex].isFinished}
              color={polygons[activePolygonIndex].color}
              handlePointDragMove={handlePointDragMove}
              handleGroupDragEnd={handleGroupDragEnd}
            />
          )}
      </Layer>
    </Stage>
  );
}

export default PolygonCanvas;
