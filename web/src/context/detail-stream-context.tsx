import React, { createContext, useContext, useState, useEffect } from "react";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";

export interface DetailStreamContextType {
  selectedObjectIds: string[];
  currentTime: number;
  camera: string;
  annotationOffset: number; // milliseconds
  setAnnotationOffset: (ms: number) => void;
  toggleObjectSelection: (id: string | undefined) => void;
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
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);

  const toggleObjectSelection = (id: string | undefined) => {
    if (id === undefined) {
      setSelectedObjectIds([]);
    } else {
      setSelectedObjectIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((existingId) => existingId !== id);
        } else {
          return [...prev, id];
        }
      });
    }
  };

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

  // Clear selected objects when exiting detail mode or changing cameras
  useEffect(() => {
    setSelectedObjectIds([]);
  }, [isDetailMode, camera]);

  const value: DetailStreamContextType = {
    selectedObjectIds,
    currentTime,
    camera,
    annotationOffset,
    setAnnotationOffset,
    toggleObjectSelection,
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
