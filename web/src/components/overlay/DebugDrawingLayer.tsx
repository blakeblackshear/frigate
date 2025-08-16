import React, { useState, useRef, useCallback, useMemo } from "react";
import { Stage, Layer, Rect } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Konva from "konva";
import { useResizeObserver } from "@/hooks/resize-observer";

type DebugDrawingLayerProps = {
  containerRef: React.RefObject<HTMLDivElement>;
  cameraWidth: number;
  cameraHeight: number;
};

function DebugDrawingLayer({
  containerRef,
  cameraWidth,
  cameraHeight,
}: DebugDrawingLayerProps) {
  const [rectangle, setRectangle] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);

  const [{ width: containerWidth }] = useResizeObserver(containerRef);

  const imageSize = useMemo(() => {
    const aspectRatio = cameraWidth / cameraHeight;
    const imageWidth = containerWidth;
    const imageHeight = imageWidth / aspectRatio;
    return { width: imageWidth, height: imageHeight };
  }, [containerWidth, cameraWidth, cameraHeight]);

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      setIsDrawing(true);
      setRectangle({ x: pos.x, y: pos.y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (pos && rectangle) {
      setRectangle({
        ...rectangle,
        width: pos.x - rectangle.x,
        height: pos.y - rectangle.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (rectangle) {
      setShowPopover(true);
    }
  };

  const convertToRealCoordinates = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const scaleX = cameraWidth / imageSize.width;
      const scaleY = cameraHeight / imageSize.height;
      return {
        x: x * scaleX,
        y: y * scaleY,
        width: width * scaleX,
        height: height * scaleY,
      };
    },
    [cameraWidth, cameraHeight, imageSize.width, imageSize.height],
  );

  const calculateArea = useCallback(() => {
    if (!rectangle) return 0;
    const { width, height } = convertToRealCoordinates(
      0,
      0,
      Math.abs(rectangle.width),
      Math.abs(rectangle.height),
    );
    return width * height;
  }, [rectangle, convertToRealCoordinates]);

  const calculateAreaPercentage = useCallback(() => {
    if (!rectangle) return 0;
    const { width, height } = convertToRealCoordinates(
      0,
      0,
      Math.abs(rectangle.width),
      Math.abs(rectangle.height),
    );
    return (width * height) / (cameraWidth * cameraHeight);
  }, [rectangle, convertToRealCoordinates, cameraWidth, cameraHeight]);

  const calculateRatio = useCallback(() => {
    if (!rectangle) return 0;
    const { width, height } = convertToRealCoordinates(
      0,
      0,
      Math.abs(rectangle.width),
      Math.abs(rectangle.height),
    );
    return width / height;
  }, [rectangle, convertToRealCoordinates]);

  return (
    <div className="absolute inset-0 cursor-crosshair">
      <Stage
        width={imageSize.width}
        height={imageSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={stageRef}
      >
        <Layer>
          {rectangle && (
            <Rect
              x={rectangle.x}
              y={rectangle.y}
              width={rectangle.width}
              height={rectangle.height}
              stroke="white"
              strokeWidth={4}
            />
          )}
        </Layer>
      </Stage>
      {showPopover && rectangle && (
        <Popover open={showPopover} onOpenChange={setShowPopover}>
          <PopoverTrigger asChild>
            <div
              style={{
                position: "absolute",
                left: `${rectangle.x + rectangle.width / 2}px`,
                top: `${rectangle.y + rectangle.height / 2}px`,
              }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-5 text-center">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col text-primary">
                Area:{" "}
                <span className="text-sm text-primary-variant">
                  px: {calculateArea().toFixed(0)}
                </span>
                <span className="text-sm text-primary-variant">
                  %: {calculateAreaPercentage().toFixed(4)}
                </span>
              </div>
              <div className="flex flex-col text-primary">
                Ratio:{" "}
                <span className="text-sm text-primary-variant">
                  {" "}
                  {calculateRatio().toFixed(2)}
                </span>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export default DebugDrawingLayer;
