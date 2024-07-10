import { firebaseConfig } from "@/types/notifications";
import { initializeApp } from "firebase/app";
import { useMemo } from "react";

export function useFirebaseApp() {
  return useMemo(() => {
    const app = initializeApp(firebaseConfig);
    app.automaticDataCollectionEnabled = false;
    return app;
  }, []);
}
