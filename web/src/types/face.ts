export type FaceLibraryData = {
  [faceName: string]: string[];
};

export type RecognizedFaceData = {
  timestamp: number;
  eventId: string;
  name: string;
  score: number;
};
