import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from "react";
import { ObjectLifecycleSequence } from "@/types/timeline";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";

interface ActivityStreamContextType {
  selectedObjectId: string | undefined;
  selectedObjectTimeline: ObjectLifecycleSequence[] | undefined;
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
  timelineData: ObjectLifecycleSequence[];
}

export function ActivityStreamProvider({
  children,
  isActivityMode,
  currentTime,
  camera,
  timelineData,
}: ActivityStreamProviderProps) {
  const [selectedObjectId, setSelectedObjectId] = useState<
    string | undefined
  >();

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

  const selectedObjectTimeline = useMemo(() => {
    if (!selectedObjectId || !timelineData) return undefined;
    return timelineData.filter((item) => item.source_id === selectedObjectId);
  }, [timelineData, selectedObjectId]);

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
