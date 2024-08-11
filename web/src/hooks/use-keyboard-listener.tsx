import { useCallback, useEffect } from "react";

export type KeyModifiers = {
  down: boolean;
  repeat: boolean;
  ctrl: boolean;
  shift: boolean;
};

export default function useKeyboardListener(
  keys: string[],
  listener: (key: string | null, modifiers: KeyModifiers) => void,
) {
  const keyDownListener = useCallback(
    (e: KeyboardEvent) => {
      if (!e) {
        return;
      }

      const modifiers = {
        down: true,
        repeat: e.repeat,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
      };

      if (keys.includes(e.key)) {
        e.preventDefault();
        listener(e.key, modifiers);
      } else if (e.key === "Shift" || e.key === "Control" || e.key === "Meta") {
        listener(null, modifiers);
      }
    },
    [keys, listener],
  );

  const keyUpListener = useCallback(
    (e: KeyboardEvent) => {
      if (!e) {
        return;
      }

      const modifiers = {
        down: false,
        repeat: false,
        ctrl: false,
        shift: false,
      };

      if (keys.includes(e.key)) {
        e.preventDefault();
        listener(e.key, modifiers);
      } else if (e.key === "Shift" || e.key === "Control" || e.key === "Meta") {
        listener(null, modifiers);
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
