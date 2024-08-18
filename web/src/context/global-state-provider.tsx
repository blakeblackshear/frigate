// GlobalStateContext.tsx
import React, { createContext, useState, ReactNode, useContext } from "react";

interface GlobalStateContextType {
  lastSelectedCamera: string;
  setLastSelectedCamera: (camera: string) => void;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
  undefined,
);

const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [lastSelectedCamera, setLastSelectedCamera] = useState<string>("");

  return (
    <GlobalStateContext.Provider
      value={{ lastSelectedCamera, setLastSelectedCamera }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};

const useGlobalState = (): GlobalStateContextType => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { GlobalStateProvider, useGlobalState };
