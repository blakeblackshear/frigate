import React, { useMemo, useRef, useState, useEffect } from "react";
import PolygonDrawer from "./PolygonDrawer";
import { Stage, Layer, Image } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Polygon } from "@/types/canvas";
import { useApiHost } from "@/api";
import { useResizeObserver } from "@/hooks/resize-observer";

type PolygonCanvasProps = {
  camera: string;
  width: number;
  height: number;
  polygons: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex: number | null;
  setActivePolygonIndex: React.Dispatch<React.SetStateAction<number | null>>;
};

export function PolygonCanvas({
  camera,
  width,
  height,
  polygons,
  setPolygons,
  activePolygonIndex,
  setActivePolygonIndex,
}: PolygonCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | undefined>();
  const imageRef = useRef<Konva.Image | null>(null);
  // const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  // const [points, setPoints] = useState<number[][]>([]);
  // const [activePolygonIndex, setActivePolygonIndex] = useState<number | null>(
  //   null,
  // );
  // const [size, setSize] = useState<{ width: number; height: number }>({
  //   width: width,
  //   height: height,
  // });
  const apiHost = useApiHost();
  // const [position, setPosition] = useState([0, 0]);
  // const [{ width: windowWidth }] = useResizeObserver(window);

  const videoElement = useMemo(() => {
    if (camera && width && height) {
      // console.log("width:", containerRef.current.clientWidth);
      // console.log("width:", containerRef.current.clientHeight);
      const element = new window.Image();
      element.width = width; //containerRef.current.clientWidth;
      element.height = height; //containerRef.current.clientHeight;
      element.src = `${apiHost}api/${camera}/latest.jpg`;
      // setSize({
      //   width: width,
      //   height: height,
      // });
      return element;
    }
  }, [camera, width, height, apiHost]);

  // const imageScale = scaledWidth / 720;
  // console.log("window width", windowWidth);

  useEffect(() => {
    if (!videoElement) {
      return;
    }
    const onload = function () {
      setImage(videoElement);
      // if (!imageRef.current) imageRef.current = videoElement;
      console.log(videoElement, Date.now());
    };
    videoElement.addEventListener("load", onload);
    return () => {
      console.log("unloading");
      videoElement.removeEventListener("load", onload);
    };
  }, [videoElement]);

  // use Konva.Animation to redraw a layer
  // useEffect(() => {
  //   //videoElement.play();
  //   if (!videoElement && !imageRef && !imageRef.current) {
  //     return;
  //   }

  //   const layer = imageRef.current?.getLayer();
  //   console.log("layer", layer);

  //   const anim = new Konva.Animation(() => {}, layer);
  //   anim.start();

  //   return () => {
  //     anim.stop();
  //   };
  // }, [videoElement]);

  const getMousePos = (stage: Konva.Stage) => {
    return [stage.getPointerPosition()!.x, stage.getPointerPosition()!.y];
  };

  const isMouseOverPoint = (polygon: Polygon, mousePos: number[]) => {
    if (!polygon || !polygon.points) {
      return false;
    }
    const [firstPoint] = polygon.points;
    console.log("first", firstPoint);
    const distance = Math.hypot(
      mousePos[0] - firstPoint[0],
      mousePos[1] - firstPoint[1],
    );
    return distance < 15;
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!activePolygonIndex || !polygons) {
      return;
    }
    console.log("mouse down polygons", polygons);
    console.log(activePolygonIndex);

    // if (!polygons[activePolygonIndex].points.length) {
    //   // Start a new polygon
    //   const stage = e.target.getStage()!;
    //   const mousePos = getMousePos(stage);
    //   setPolygons([
    //     ...polygons,
    //     {
    //       name: "foo",
    //       points: [mousePos],
    //       isFinished: false,
    //     },
    //   ]);
    //   setActivePolygonIndex(polygons.length);
    // } else {
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
      // setActivePolygonIndex(null);
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

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()!;
    const mousePos = getMousePos(stage);
    // setPosition(mousePos);
  };

  const handleMouseOverStartPoint = (e: KonvaEventObject<MouseEvent>) => {
    if (activePolygonIndex !== null && polygons) {
      const activePolygon = polygons[activePolygonIndex];
      if (!activePolygon.isFinished && activePolygon.points.length >= 3) {
        e.currentTarget.scale({ x: 2, y: 2 });
      }
    }
  };

  const handleMouseOutStartPoint = (e: KonvaEventObject<MouseEvent>) => {
    // console.log("active index:", activePolygonIndex);
    e.currentTarget.scale({ x: 1, y: 1 });
    if (activePolygonIndex !== null && polygons) {
      const activePolygon = polygons[activePolygonIndex];
      // console.log(activePolygon);
      if (
        (!activePolygon.isFinished && activePolygon.points.length >= 3) ||
        activePolygon.isFinished
      ) {
        // console.log(e.currentTarget);
        e.currentTarget.scale({ x: 1, y: 1 });
      }
    }
  };

  const handlePointDragMove = (e: KonvaEventObject<MouseEvent>) => {
    if (activePolygonIndex !== null && polygons) {
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
    }
  };

  const flattenPoints = (points: number[][]): number[] => {
    return points.reduce((acc, point) => [...acc, ...point], []);
  };

  const handleGroupDragEnd = (e: KonvaEventObject<MouseEvent>) => {
    if (activePolygonIndex !== null && e.target.name() === "polygon") {
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
  // console.log("rendering canvas", Date.now());

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      // onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
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
        {polygons?.map((polygon, index) => (
          <PolygonDrawer
            key={index}
            points={polygon.points}
            flattenedPoints={flattenPoints(polygon.points)}
            isActive={index === activePolygonIndex}
            isFinished={polygon.isFinished}
            handlePointDragMove={handlePointDragMove}
            handleGroupDragEnd={handleGroupDragEnd}
            handleMouseOverStartPoint={handleMouseOverStartPoint}
            handleMouseOutStartPoint={handleMouseOutStartPoint}
          />
        ))}
      </Layer>
    </Stage>
  );
}

export default PolygonCanvas;
