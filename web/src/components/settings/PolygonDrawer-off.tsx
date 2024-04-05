import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Stage, Layer, Line, Circle, Transformer } from "react-konva";
import useDoubleClick from "@/hooks/use-double-click";

export default function PolygonDrawer() {
  const [points, setPoints] = useState<number[]>([]);
  const [anchors, setAnchors] = useState<Konva.Circle[]>([]);
  const [lastPointIndex, setLastPointIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedAnchorIndex, setSelectedAnchorIndex] = useState<number | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const handleMouseDown = () => {
    if (!stageRef.current) {
      return;
    }

    const stage = stageRef.current.getStage();
    const mousePos = stage?.getPointerPosition();
    if (!mousePos) return;

    const updatedPoints = [...points];
    updatedPoints.push(mousePos.x, mousePos.y);
    setPoints(updatedPoints);

    const newAnchor = new Konva.Circle({
      x: mousePos.x,
      y: mousePos.y,
      radius: 5,
      fill: "blue",
      draggable: true,
      name: "anchor",
    });
    setAnchors((prevAnchors) => [...prevAnchors, newAnchor]);
    layerRef.current?.add(newAnchor);

    setIsDrawing(true);
  };
  console.log(isDrawing);

  const handleMouseMove = () => {
    const stage = stageRef.current?.getStage();
    const mousePos = stage?.getPointerPosition();
    if (!mousePos || !isDrawing) return;

    const updatedPoints = [...points];
    updatedPoints[updatedPoints.length - 2] = mousePos.x;
    updatedPoints[updatedPoints.length - 1] = mousePos.y;
    setPoints(updatedPoints);
    layerRef.current?.batchDraw();
  };

  const handleDoubleClick = () => {
    alert("double clicked 1");
    const layer = layerRef.current;
    console.log(layer);
    if (!layer) return;
    console.log("double clicked");
    document.body.style.background = "red";

    const tempLine = layerRef.current.findOne(".temp");
    if (tempLine) tempLine.destroy();

    const polyObj = new Konva.Line({
      points,
      name: "poly",
      fill: "green",
      stroke: "red",
      strokeWidth: 1,
      draggable: true,
      closed: true,
      hitStrokeWidth: 10,
    });
    layerRef.current.add(polyObj);
    layerRef.current.batchDraw();

    setIsDrawing(false);
    setLastPointIndex(0);
    setPoints([]);
    setAnchors([]);
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedTarget = e.target;
    if (clickedTarget instanceof Konva.Circle) {
      const index = anchors.findIndex((anchor) => anchor === clickedTarget);
      setSelectedAnchorIndex(index);
    } else {
      setSelectedAnchorIndex(null);
    }
  };

  const handleAnchorDragMove = (index: number) => {
    const stage = stageRef.current?.getStage();
    const mousePos = stage?.getPointerPosition();
    if (!mousePos) return;

    const updatedAnchors = [...anchors];
    updatedAnchors[index] = new Konva.Circle({
      ...updatedAnchors[index].attrs,
      x: mousePos.x,
      y: mousePos.y,
    });
    setAnchors(updatedAnchors);

    const updatedPoints = [...points];
    updatedPoints[index * 2] = mousePos.x;
    updatedPoints[index * 2 + 1] = mousePos.y;
    setPoints(updatedPoints);

    layerRef.current?.batchDraw();
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (stage) {
      console.log(stage);
      stage.on("mousedown", handleMouseDown);
      stage.on("mousemove", handleMouseMove);
      stage.on("dblclick", handleDoubleClick);
    }
    return () => {
      if (stage) {
        stage.off("mousedown", handleMouseDown);
        stage.off("mousemove", handleMouseMove);
        stage.off("dblclick", handleDoubleClick);
      }
    };
  }, []);

  console.log(points);

  return (
    <div id="konva" ref={containerRef}>
      <Stage
        width={600}
        height={480}
        // onDblClick={(e) => {
        //   e.cancelBubble = true;
        //   console.log("dbl");
        //   handleDoubleClick();
        // }}
        // onMouseDown={handleMouseDown}
        // onMouseMove={handleMouseMove}
        // onClick={handleStageClick}
        ref={stageRef}
      >
        <Layer ref={layerRef}>
          {isDrawing && (
            <Line
              points={points}
              name="temp"
              fill="green"
              stroke="red"
              strokeWidth={1}
              draggable={false}
            />
          )}
          {anchors.map((anchor, index) => (
            <Circle
              key={index}
              x={anchor.x()}
              y={anchor.y()}
              radius={5}
              fill={selectedAnchorIndex === index ? "red" : "blue"}
              draggable
              onDragMove={(e) => handleAnchorDragMove(index, e)}
            />
          ))}
        </Layer>
      </Stage>
      <div id="debug">debug</div>
    </div>
  );
}
