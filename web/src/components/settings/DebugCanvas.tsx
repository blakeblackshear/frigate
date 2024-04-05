import React, { useMemo, useRef, useState, useEffect } from "react";
import PolygonDrawer from "./PolygonDrawer";
import { Stage, Layer, Image } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Button } from "../ui/button";

const videoSource = "./space_landscape.jpg";

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: 20,
  backgroundColor: "aliceblue",
};

const columnStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  alignItems: "center",
  marginTop: 20,
  backgroundColor: "aliceblue",
};

export function DebugCanvas() {
  const [image, setImage] = useState<HTMLImageElement | undefined>();
  const imageRef = useRef<Konva.Image | null>(null);
  const dataRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [points, setPoints] = useState<number[][]>([]);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [flattenedPoints, setFlattenedPoints] = useState<number[]>([]);
  const [position, setPosition] = useState([0, 0]);
  const [isMouseOverPoint, setMouseOverPoint] = useState(false);
  const [isPolyComplete, setPolyComplete] = useState(false);

  const videoElement = useMemo(() => {
    const element = new window.Image();
    element.width = 650;
    element.height = 302;
    element.src = videoSource;
    return element;
  }, []); // No dependency needed here since videoSource is a constant

  useEffect(() => {
    const onload = function () {
      setSize({
        width: videoElement.width,
        height: videoElement.height,
      });
      setImage(videoElement);
      if (imageRef.current) imageRef.current = videoElement;
    };
    videoElement.addEventListener("load", onload);
    return () => {
      videoElement.removeEventListener("load", onload);
    };
  }, [videoElement]);

  const getMousePos = (stage: Konva.Stage) => {
    return [stage.getPointerPosition()!.x, stage.getPointerPosition()!.y];
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (isPolyComplete) return;
    const stage = e.target.getStage()!;
    const mousePos = getMousePos(stage);
    if (isMouseOverPoint && points.length >= 3) {
      setPolyComplete(true);
    } else {
      setPoints([...points, mousePos]);
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()!;
    const mousePos = getMousePos(stage);
    setPosition(mousePos);
  };

  const handleMouseOverStartPoint = (e: KonvaEventObject<MouseEvent>) => {
    if (isPolyComplete || points.length < 3) return;
    e.currentTarget.scale({ x: 3, y: 3 });
    setMouseOverPoint(true);
  };

  const handleMouseOutStartPoint = (e: KonvaEventObject<MouseEvent>) => {
    e.currentTarget.scale({ x: 1, y: 1 });
    setMouseOverPoint(false);
  };

  const handlePointDragMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) {
      const index = e.target.index - 1;
      const pos = [e.target._lastPos!.x, e.target._lastPos!.y];
      if (pos[0] < 0) pos[0] = 0;
      if (pos[1] < 0) pos[1] = 0;
      if (pos[0] > stage.width()) pos[0] = stage.width();
      if (pos[1] > stage.height()) pos[1] = stage.height();
      setPoints([...points.slice(0, index), pos, ...points.slice(index + 1)]);
    }
  };

  useEffect(() => {
    setFlattenedPoints(
      points
        .concat(isPolyComplete ? [] : position)
        .reduce((a, b) => a.concat(b), []),
    );
  }, [points, isPolyComplete, position]);

  const undo = () => {
    setPoints(points.slice(0, -1));
    setPolyComplete(false);
    setPosition(points[points.length - 1]);
  };

  const reset = () => {
    setPoints([]);
    setPolyComplete(false);
  };

  const handleGroupDragEnd = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target.name() === "polygon") {
      const result: number[][] = [];
      const copyPoints = [...points];
      copyPoints.map((point) =>
        result.push([point[0] + e.target.x(), point[1] + e.target.y()]),
      );
      e.target.position({ x: 0, y: 0 });
      setPoints(result);
    }
  };

  return (
    <div style={wrapperStyle}>
      <div style={columnStyle}>
        <Stage
          ref={stageRef}
          width={size.width || 650}
          height={size.height || 302}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
        >
          <Layer>
            <Image
              ref={imageRef}
              image={image}
              x={0}
              y={0}
              width={size.width}
              height={size.height}
            />
            <PolygonDrawer
              points={points}
              flattenedPoints={flattenedPoints}
              handlePointDragMove={handlePointDragMove}
              handleGroupDragEnd={handleGroupDragEnd}
              handleMouseOverStartPoint={handleMouseOverStartPoint}
              handleMouseOutStartPoint={handleMouseOutStartPoint}
              isFinished={isPolyComplete}
            />
          </Layer>
        </Stage>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Button name="Undo" onClick={undo} />
          <Button name="Reset" onClick={reset} />
        </div>
      </div>
      <div
        ref={dataRef}
        style={{
          width: 375,
          height: 302,
          boxShadow: ".5px .5px 5px .4em rgba(0,0,0,.1)",
          marginTop: 20,
          color: "black",
        }}
      >
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(points)}</pre>
      </div>
    </div>
  );
}

export default DebugCanvas;
