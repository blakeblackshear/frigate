import { useCallback, useEffect } from "react";

export type KeyModifiers = {
  down: boolean;
  repeat: boolean;
  ctrl: boolean;
};

export default function useKeyboardListener(
  keys: string[],
  listener: (key: string, modifiers: KeyModifiers) => void,
) {
  const keyDownListener = useCallback(
    (e: KeyboardEvent) => {
      if (!e) {
        return;
      }

      if (keys.includes(e.key)) {
        e.preventDefault();
        listener(e.key, { down: true, repeat: e.repeat, ctrl: e.ctrlKey });
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
        listener(e.key, { down: false, repeat: false, ctrl: false });
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
