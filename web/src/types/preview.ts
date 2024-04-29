import { REVIEW_PADDING } from "./review";

export type Preview = {
  camera: string;
  src: string;
  type: string;
  start: number;
  end: number;
};

export const PREVIEW_PADDING = REVIEW_PADDING * 2;
