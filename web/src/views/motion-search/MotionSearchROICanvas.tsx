import { useCallback, useMemo, useRef } from "react";
import { Stage, Layer, Line, Circle, Image } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { flattenPoints } from "@/utils/canvasUtil";
import { cn } from "@/lib/utils";
import { useResizeObserver } from "@/hooks/resize-observer";

type MotionSearchROICanvasProps = {
  camera: string;
  width: number;
  height: number;
  polygonPoints: number[][];
  setPolygonPoints: React.Dispatch<React.SetStateAction<number[][]>>;
  isDrawing: boolean;
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  isInteractive?: boolean;
  motionHeatmap?: Record<string, number> | null;
  showMotionHeatmap?: boolean;
};

export default function MotionSearchROICanvas({
  width,
  height,
  polygonPoints,
  setPolygonPoints,
  isDrawing,
  setIsDrawing,
  isInteractive = true,
  motionHeatmap,
  showMotionHeatmap = false,
}: MotionSearchROICanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);

  const stageSize = useMemo(
    () => ({
      width: containerWidth > 0 ? Math.ceil(containerWidth) : 0,
      height: containerHeight > 0 ? Math.ceil(containerHeight) : 0,
    }),
    [containerHeight, containerWidth],
  );

  const videoRect = useMemo(() => {
    const stageWidth = stageSize.width;
    const stageHeight = stageSize.height;
    const sourceWidth = width > 0 ? width : 1;
    const sourceHeight = height > 0 ? height : 1;

    if (stageWidth <= 0 || stageHeight <= 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const stageAspect = stageWidth / stageHeight;
    const sourceAspect = sourceWidth / sourceHeight;

    if (stageAspect > sourceAspect) {
      const fittedHeight = stageHeight;
      const fittedWidth = fittedHeight * sourceAspect;
      return {
        x: (stageWidth - fittedWidth) / 2,
        y: 0,
        width: fittedWidth,
        height: fittedHeight,
      };
    }

    const fittedWidth = stageWidth;
    const fittedHeight = fittedWidth / sourceAspect;
    return {
      x: 0,
      y: (stageHeight - fittedHeight) / 2,
      width: fittedWidth,
      height: fittedHeight,
    };
  }, [height, stageSize.height, stageSize.width, width]);

  // Convert normalized points to stage coordinates
  const scaledPoints = useMemo(() => {
    return polygonPoints.map((point) => [
      videoRect.x + point[0] * videoRect.width,
      videoRect.y + point[1] * videoRect.height,
    ]);
  }, [
    polygonPoints,
    videoRect.height,
    videoRect.width,
    videoRect.x,
    videoRect.y,
  ]);

  const flattenedPoints = useMemo(
    () => flattenPoints(scaledPoints),
    [scaledPoints],
  );

  const heatmapOverlayCanvas = useMemo(() => {
    if (
      !showMotionHeatmap ||
      !motionHeatmap ||
      videoRect.width === 0 ||
      videoRect.height === 0
    ) {
      return null;
    }

    const gridSize = 16;
    const heatmapLevels = Object.values(motionHeatmap)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    const maxHeatmapLevel =
      heatmapLevels.length > 0 ? Math.max(...heatmapLevels) : 0;

    if (maxHeatmapLevel <= 0) {
      return null;
    }

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = gridSize;
    maskCanvas.height = gridSize;

    const maskContext = maskCanvas.getContext("2d");
    if (!maskContext) {
      return null;
    }

    const imageData = maskContext.createImageData(gridSize, gridSize);
    const heatmapStops = [
      { t: 0, r: 0, g: 0, b: 255 },
      { t: 0.25, r: 0, g: 255, b: 255 },
      { t: 0.5, r: 0, g: 255, b: 0 },
      { t: 0.75, r: 255, g: 255, b: 0 },
      { t: 1, r: 255, g: 0, b: 0 },
    ];

    const getHeatmapColor = (value: number) => {
      const clampedValue = Math.min(1, Math.max(0, value));

      const upperIndex = heatmapStops.findIndex(
        (stop) => stop.t >= clampedValue,
      );
      if (upperIndex <= 0) {
        return heatmapStops[0];
      }

      const lower = heatmapStops[upperIndex - 1];
      const upper = heatmapStops[upperIndex];
      const range = upper.t - lower.t;
      const blend = range > 0 ? (clampedValue - lower.t) / range : 0;

      return {
        r: Math.round(lower.r + (upper.r - lower.r) * blend),
        g: Math.round(lower.g + (upper.g - lower.g) * blend),
        b: Math.round(lower.b + (upper.b - lower.b) * blend),
      };
    };

    for (let index = 0; index < gridSize ** 2; index++) {
      const level = Number(motionHeatmap[index.toString()] ?? 0);
      const normalizedLevel =
        level > 0 ? Math.min(1, Math.max(0, level / maxHeatmapLevel)) : 0;
      const alpha =
        level > 0
          ? Math.min(0.95, Math.max(0.1, 0.15 + normalizedLevel * 0.5))
          : 0;
      const color = getHeatmapColor(normalizedLevel);

      const pixelOffset = index * 4;
      imageData.data[pixelOffset] = color.r;
      imageData.data[pixelOffset + 1] = color.g;
      imageData.data[pixelOffset + 2] = color.b;
      imageData.data[pixelOffset + 3] = Math.round(alpha * 255);
    }

    maskContext.putImageData(imageData, 0, 0);

    return maskCanvas;
  }, [motionHeatmap, showMotionHeatmap, videoRect.height, videoRect.width]);

  // Handle mouse click to add point
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isInteractive || !isDrawing) return;
      if (videoRect.width <= 0 || videoRect.height <= 0) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const mousePos = stage.getPointerPosition();
      if (!mousePos) return;

      const intersection = stage.getIntersection(mousePos);

      // If clicking on first point and we have at least 3 points, close the polygon
      if (polygonPoints.length >= 3 && intersection?.name() === "point-0") {
        setIsDrawing(false);
        return;
      }

      // Only add point if not clicking on an existing point
      if (intersection?.getClassName() !== "Circle") {
        const clampedX = Math.min(
          Math.max(mousePos.x, videoRect.x),
          videoRect.x + videoRect.width,
        );
        const clampedY = Math.min(
          Math.max(mousePos.y, videoRect.y),
          videoRect.y + videoRect.height,
        );

        // Convert to normalized coordinates (0-1)
        const normalizedX = (clampedX - videoRect.x) / videoRect.width;
        const normalizedY = (clampedY - videoRect.y) / videoRect.height;

        setPolygonPoints([...polygonPoints, [normalizedX, normalizedY]]);
      }
    },
    [
      isDrawing,
      polygonPoints,
      setPolygonPoints,
      setIsDrawing,
      isInteractive,
      videoRect.height,
      videoRect.width,
      videoRect.x,
      videoRect.y,
    ],
  );

  // Handle point drag
  const handlePointDragMove = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>, index: number) => {
      if (!isInteractive) return;
      const stage = e.target.getStage();
      if (!stage) return;

      const pos = { x: e.target.x(), y: e.target.y() };

      // Constrain to fitted video boundaries
      pos.x = Math.max(
        videoRect.x,
        Math.min(pos.x, videoRect.x + videoRect.width),
      );
      pos.y = Math.max(
        videoRect.y,
        Math.min(pos.y, videoRect.y + videoRect.height),
      );

      // Convert to normalized coordinates
      const normalizedX = (pos.x - videoRect.x) / videoRect.width;
      const normalizedY = (pos.y - videoRect.y) / videoRect.height;

      const newPoints = [...polygonPoints];
      newPoints[index] = [normalizedX, normalizedY];
      setPolygonPoints(newPoints);
    },
    [
      polygonPoints,
      setPolygonPoints,
      isInteractive,
      videoRect.height,
      videoRect.width,
      videoRect.x,
      videoRect.y,
    ],
  );

  // Handle right-click to delete point
  const handleContextMenu = useCallback(
    (e: KonvaEventObject<MouseEvent>, index: number) => {
      if (!isInteractive) return;
      e.evt.preventDefault();

      if (polygonPoints.length <= 3 && !isDrawing) {
        // Don't delete if we have a closed polygon with minimum points
        return;
      }

      const newPoints = polygonPoints.filter((_, i) => i !== index);
      setPolygonPoints(newPoints);

      // If we deleted enough points, go back to drawing mode
      if (newPoints.length < 3) {
        setIsDrawing(true);
      }
    },
    [polygonPoints, isDrawing, setPolygonPoints, setIsDrawing, isInteractive],
  );

  // Handle mouse hover on first point
  const handleMouseOverPoint = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>, index: number) => {
      if (!isInteractive) return;
      if (!isDrawing || polygonPoints.length < 3 || index !== 0) return;
      e.target.scale({ x: 2, y: 2 });
    },
    [isDrawing, isInteractive, polygonPoints.length],
  );

  const handleMouseOutPoint = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>, index: number) => {
      if (!isInteractive) return;
      if (index === 0) {
        e.target.scale({ x: 1, y: 1 });
      }
    },
    [isInteractive],
  );

  const vertexRadius = 6;
  const polygonColorString = "rgba(66, 135, 245, 0.8)";
  const polygonFillColor = "rgba(66, 135, 245, 0.2)";

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 z-10",
        isInteractive ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={{ cursor: isDrawing ? "crosshair" : "default" }}
    >
      {stageSize.width > 0 && stageSize.height > 0 && (
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onContextMenu={(e) => e.evt.preventDefault()}
          className="absolute inset-0"
        >
          <Layer>
            {/* Segment heatmap overlay */}
            {heatmapOverlayCanvas && (
              <Image
                image={heatmapOverlayCanvas}
                x={videoRect.x}
                y={videoRect.y}
                width={videoRect.width}
                height={videoRect.height}
                listening={false}
              />
            )}

            {/* Polygon outline */}
            {scaledPoints.length > 0 && (
              <Line
                points={flattenedPoints}
                stroke={polygonColorString}
                strokeWidth={2}
                closed={!isDrawing && scaledPoints.length >= 3}
                fill={
                  !isDrawing && scaledPoints.length >= 3
                    ? polygonFillColor
                    : undefined
                }
              />
            )}

            {/* Draw line from last point to cursor when drawing */}
            {isDrawing && scaledPoints.length > 0 && (
              <Line
                points={flattenedPoints}
                stroke={polygonColorString}
                strokeWidth={2}
                dash={[5, 5]}
              />
            )}

            {/* Vertex points */}
            {scaledPoints.map((point, index) => (
              <Circle
                key={index}
                name={`point-${index}`}
                x={point[0]}
                y={point[1]}
                radius={vertexRadius}
                fill={polygonColorString}
                stroke="white"
                strokeWidth={2}
                draggable={!isDrawing && isInteractive}
                onDragMove={(e) => handlePointDragMove(e, index)}
                onMouseOver={(e) => handleMouseOverPoint(e, index)}
                onMouseOut={(e) => handleMouseOutPoint(e, index)}
                onContextMenu={(e) => handleContextMenu(e, index)}
              />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
