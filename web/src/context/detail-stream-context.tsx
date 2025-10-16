import React, { createContext, useContext, useState, useEffect } from "react";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { ObjectLifecycleSequence } from "@/types/timeline";

interface DetailStreamContextType {
  selectedObjectId: string | undefined;
  selectedObjectTimeline?: ObjectLifecycleSequence[];
  currentTime: number;
  camera: string;
  annotationOffset: number; // milliseconds
  setAnnotationOffset: (ms: number) => void;
  setSelectedObjectId: (id: string | undefined) => void;
  isDetailMode: boolean;
}

const DetailStreamContext = createContext<DetailStreamContextType | undefined>(
  undefined,
);

interface DetailStreamProviderProps {
  children: React.ReactNode;
  isDetailMode: boolean;
  currentTime: number;
  camera: string;
}

export function DetailStreamProvider({
  children,
  isDetailMode,
  currentTime,
  camera,
}: DetailStreamProviderProps) {
  const [selectedObjectId, setSelectedObjectId] = useState<
    string | undefined
  >();

  const { data: selectedObjectTimeline } = useSWR<ObjectLifecycleSequence[]>(
    selectedObjectId ? ["timeline", { source_id: selectedObjectId }] : null,
  );

  const { data: config } = useSWR<FrigateConfig>("config");

  const [annotationOffset, setAnnotationOffset] = useState<number>(() => {
    if (!config) return 0;
    return config.cameras[camera]?.detect?.annotation_offset || 0;
  });

  useEffect(() => {
    if (!config) return;
    const cfgOffset = config.cameras[camera]?.detect?.annotation_offset || 0;
    setAnnotationOffset(cfgOffset);
  }, [config, camera]);

  const value: DetailStreamContextType = {
    selectedObjectId,
    selectedObjectTimeline,
    currentTime,
    camera,
    annotationOffset,
    setAnnotationOffset,
    setSelectedObjectId,
    isDetailMode,
  };

  return (
    <DetailStreamContext.Provider value={value}>
      {children}
    </DetailStreamContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDetailStream() {
  const context = useContext(DetailStreamContext);
  if (context === undefined) {
    throw new Error(
      "useDetailStream must be used within an DetailStreamProvider",
    );
  }
  return context;
}
