import React, { useMemo, useRef, useState, useEffect } from "react";
import PolygonDrawer from "./PolygonDrawer";
import { Stage, Layer, Image, Text, Circle } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Polygon, PolygonType } from "@/types/canvas";
import { useApiHost } from "@/api";
import { getAveragePoint } from "@/utils/canvasUtil";

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

  const isMouseOverPoint = (polygon: Polygon, mousePos: number[]) => {
    if (!polygon || !polygon.points) {
      return false;
    }
    const [firstPoint] = polygon.points;
    const distance = Math.hypot(
      mousePos[0] - firstPoint[0],
      mousePos[1] - firstPoint[1],
    );
    return distance < 15;
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
      isMouseOverPoint(activePolygon, mousePos)
    ) {
      // Close the polygon
      updatedPolygons[activePolygonIndex] = {
        ...activePolygon,
        isFinished: true,
      };
      setPolygons(updatedPolygons);
    } else {
      if (!activePolygon.isFinished) {
        // Add a new point to the active polygon
        updatedPolygons[activePolygonIndex] = {
          ...activePolygon,
          points: [...activePolygon.points, mousePos],
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

  const flattenPoints = (points: number[][]): number[] => {
    return points.reduce((acc, point) => [...acc, ...point], []);
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

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
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
              selectedZoneMask.includes(polygon.type)) && (
              <React.Fragment key={index}>
                <PolygonDrawer
                  key={index}
                  points={polygon.points}
                  flattenedPoints={flattenPoints(polygon.points)}
                  isActive={index === activePolygonIndex}
                  isHovered={index === hoveredPolygonIndex}
                  isFinished={polygon.isFinished}
                  color={polygon.color}
                  name={polygon.name}
                  handlePointDragMove={handlePointDragMove}
                  handleGroupDragEnd={handleGroupDragEnd}
                  handleMouseOverStartPoint={handleMouseOverStartPoint}
                  handleMouseOutStartPoint={handleMouseOutStartPoint}
                />
                {index === hoveredPolygonIndex && (
                  <>
                    <Circle
                      x={
                        getAveragePoint(flattenPoints(polygon.points)).x //-
                        //(polygon.name.length * 16 * 0.6) / 2
                      }
                      y={
                        getAveragePoint(flattenPoints(polygon.points)).y //-
                        //16 / 2
                      }
                      radius={2}
                      fill="red"
                    />
                    <Text
                      text={polygon.name}
                      // align="left"
                      // verticalAlign="top"
                      align="center"
                      verticalAlign="middle"
                      x={
                        getAveragePoint(flattenPoints(polygon.points)).x //-
                        //(polygon.name.length * 16 * 0.6) / 2
                      }
                      y={
                        getAveragePoint(flattenPoints(polygon.points)).y //-
                        //16 / 2
                      }
                      fontSize={16}
                    />
                  </>
                )}
              </React.Fragment>
            ),
        )}
      </Layer>
    </Stage>
  );
}

export default PolygonCanvas;
