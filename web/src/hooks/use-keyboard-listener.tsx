import { useCallback, useEffect } from "react";

export default function useKeyboardListener(
  keys: string[],
  listener: (key: string, down: boolean, repeat: boolean) => void,
) {
  const keyDownListener = useCallback(
    (e: KeyboardEvent) => {
      if (!e) {
        return;
      }

      if (keys.includes(e.key)) {
        e.preventDefault();
        listener(e.key, true, e.repeat);
      }
    },
    [keys, listener],
  );

  const keyUpListener = useCallback(
    (e: KeyboardEvent) => {
      if (!e) {
        return;
      }

      if (keys.includes(e.key)) {
        e.preventDefault();
        listener(e.key, false, false);
      }
    },
    [keys, listener],
  );

  useEffect(() => {
    document.addEventListener("keydown", keyDownListener);
    document.addEventListener("keyup", keyUpListener);
    return () => {
      document.removeEventListener("keydown", keyDownListener);
      document.removeEventListener("keyup", keyUpListener);
    };
  }, [listener, keyDownListener, keyUpListener]);
}
