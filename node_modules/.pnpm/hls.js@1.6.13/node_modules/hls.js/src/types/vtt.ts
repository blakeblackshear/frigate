export type VTTCCs = {
  ccOffset: number;
  presentationOffset: number;
  [key: number]: {
    start: number;
    prevCC: number;
    new: boolean;
  };
};
