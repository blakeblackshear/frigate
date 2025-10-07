import React, { createContext, useContext, useState } from "react";

interface ActivityStreamContextType {
  selectedObjectId: string | undefined;
  currentTime: number;
  camera: string;
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

  const value: ActivityStreamContextType = {
    selectedObjectId,
    currentTime,
    camera,
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
