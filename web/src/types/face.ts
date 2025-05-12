export type FaceLibraryData = {
  [faceName: string]: string[];
};

export type RecognizedFaceData = {
  filename: string;
  timestamp: number;
  eventId: string;
  name: string;
  score: number;
};
