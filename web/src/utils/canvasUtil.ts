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
    const newX = Math.min(+((x * newWidth) / width).toFixed(3), newWidth);
    const newY = Math.min(+((y * newHeight) / height).toFixed(3), newHeight);
    newPoints.push([newX, newY]);
  }

  return newPoints;
};

export const parseCoordinates = (coordinatesString: string) => {
  const coordinates = coordinatesString.split(",");
  const points = [];

  for (let i = 0; i < coordinates.length; i += 2) {
    const x = parseFloat(coordinates[i]);
    const y = parseFloat(coordinates[i + 1]);
    points.push([x, y]);
  }

  return points;
};

export const flattenPoints = (points: number[][]): number[] => {
  return points.reduce((acc, point) => [...acc, ...point], []);
};

export const toRGBColorString = (color: number[], darkened: boolean) => {
  if (color.length !== 3) {
    return "rgb(220,0,0,0.5)";
  }

  return `rgba(${color[2]},${color[1]},${color[0]},${darkened ? "0.7" : "0.3"})`;
};

export const masksAreIdentical = (arr1: string[], arr2: string[]): boolean => {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
};
