import { Vector2d } from "konva/lib/types";

export const getAveragePoint = (points: number[]): Vector2d => {
  let totalX = 0;
  let totalY = 0;
  for (let i = 0; i < points.length; i += 2) {
    totalX += points[i];
    totalY += points[i + 1];
  }
  return {
    x: totalX / (points.length / 2),
    y: totalY / (points.length / 2),
  };
};

export const getDistance = (node1: number[], node2: number[]): string => {
  const diffX = Math.abs(node1[0] - node2[0]);
  const diffY = Math.abs(node1[1] - node2[1]);
  const distanceInPixel = Math.sqrt(diffX * diffX + diffY * diffY);
  return distanceInPixel.toFixed(2);
};

export const dragBoundFunc = (
  stageWidth: number,
  stageHeight: number,
  vertexRadius: number,
  pos: Vector2d,
): Vector2d => {
  let x = pos.x;
  let y = pos.y;
  if (pos.x + vertexRadius > stageWidth) x = stageWidth;
  if (pos.x - vertexRadius < 0) x = 0;
  if (pos.y + vertexRadius > stageHeight) y = stageHeight;
  if (pos.y - vertexRadius < 0) y = 0;
  return { x, y };
};

export const minMax = (points: number[]): [number, number] => {
  return points.reduce(
    (acc: [number | undefined, number | undefined], val) => {
      acc[0] = acc[0] === undefined || val < acc[0] ? val : acc[0];
      acc[1] = acc[1] === undefined || val > acc[1] ? val : acc[1];
      return acc;
    },
    [undefined, undefined],
  ) as [number, number];
};

export const interpolatePoints = (
  points: number[][],
  width: number,
  height: number,
  newWidth: number,
  newHeight: number,
): number[][] => {
  const newPoints: number[][] = [];

  for (const [x, y] of points) {
    const newX = (x * newWidth) / width;
    const newY = (y * newHeight) / height;
    newPoints.push([newX, newY]);
  }

  return newPoints;
};
