import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";

export interface DetailStreamContextType {
  selectedObjectIds: string[];
  currentTime: number;
  camera: string;
  annotationOffset: number; // milliseconds
  setSelectedObjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  setAnnotationOffset: React.Dispatch<React.SetStateAction<number>>;
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
  initialSelectedObjectIds?: string[];
}

export function DetailStreamProvider({
  children,
  isDetailMode,
  currentTime,
  camera,
  initialSelectedObjectIds,
}: DetailStreamProviderProps) {
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>(
    () => initialSelectedObjectIds ?? [],
  );

  // When the parent provides a new initialSelectedObjectIds (for example
  // when navigating between search results) update the selection so children
  // like `ObjectTrackOverlay` receive the new ids immediately. We only
  // perform this update when the incoming value actually changes.
  useEffect(() => {
    if (
      initialSelectedObjectIds &&
      (initialSelectedObjectIds.length !== selectedObjectIds.length ||
        initialSelectedObjectIds.some((v, i) => selectedObjectIds[i] !== v))
    ) {
      setSelectedObjectIds(initialSelectedObjectIds);
    }
    // Intentionally include selectedObjectIds to compare previous value and
    // avoid overwriting user interactions unless the incoming prop changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedObjectIds]);

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

  // Clear selected objects when exiting detail mode or when the camera
  // changes for providers that are not initialized with an explicit
  // `initialSelectedObjectIds` (e.g., the RecordingView). For providers
  // that receive `initialSelectedObjectIds` (like SearchDetailDialog) we
  // avoid clearing on camera change to prevent a race with children that
  // immediately set selection when mounting.
  const prevCameraRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    // Always clear when leaving detail mode
    if (!isDetailMode) {
      setSelectedObjectIds([]);
      prevCameraRef.current = camera;
      return;
    }

    // If camera changed and the parent did not provide initialSelectedObjectIds,
    // clear selection to preserve previous behavior.
    if (
      prevCameraRef.current !== undefined &&
      prevCameraRef.current !== camera &&
      initialSelectedObjectIds === undefined
    ) {
      setSelectedObjectIds([]);
    }

    prevCameraRef.current = camera;
  }, [isDetailMode, camera, initialSelectedObjectIds]);

  const value: DetailStreamContextType = {
    selectedObjectIds,
    currentTime,
    camera,
    annotationOffset,
    setAnnotationOffset,
    setSelectedObjectIds,
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
