import { getMessaging } from "firebase/messaging";
import { initializeApp } from "firebase/app";
import { useEffect, useMemo, useState } from "react";

export function useFirebaseApp() {
  const [firebaseConfig, setFirebaseConfig] = useState();

  useEffect(() => {
    if (!firebaseConfig) {
      fetch(`${window.location.href}/firebase-config.json`).then(
        async (resp) => {
          setFirebaseConfig(await resp.json());
        },
      );
    }
  }, [firebaseConfig]);

  return useMemo(() => {
    if (!firebaseConfig) {
      return;
    }

    const app = initializeApp(firebaseConfig);
    app.automaticDataCollectionEnabled = false;
    return app;
  }, [firebaseConfig]);
}

export function useFirebaseMessaging() {
  return useMemo(() => getMessaging(), []);
}
