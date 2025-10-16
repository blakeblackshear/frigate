import React, { createContext, useContext, useState, useEffect } from "react";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { ObjectLifecycleSequence } from "@/types/timeline";

interface ActivityStreamContextType {
  selectedObjectId: string | undefined;
  selectedObjectTimeline?: ObjectLifecycleSequence[];
  currentTime: number;
  camera: string;
  annotationOffset: number; // milliseconds
  setAnnotationOffset: (ms: number) => void;
  setSelectedObjectId: (id: string | undefined) => void;
  isActivityMode: boolean;
}

const ActivityStreamContext = createContext<
  ActivityStreamContextType | undefined
>(undefined);

interface ActivityStreamProviderProps {
  children: React.ReactNode;
  isActivityMode: boolean;
  currentTime: number;
  camera: string;
}

export function ActivityStreamProvider({
  children,
  isActivityMode,
  currentTime,
  camera,
}: ActivityStreamProviderProps) {
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

  const value: ActivityStreamContextType = {
    selectedObjectId,
    selectedObjectTimeline,
    currentTime,
    camera,
    annotationOffset,
    setAnnotationOffset,
    setSelectedObjectId,
    isActivityMode,
  };

  return (
    <ActivityStreamContext.Provider value={value}>
      {children}
    </ActivityStreamContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActivityStream() {
  const context = useContext(ActivityStreamContext);
  if (context === undefined) {
    throw new Error(
      "useActivityStream must be used within an ActivityStreamProvider",
    );
  }
  return context;
}
