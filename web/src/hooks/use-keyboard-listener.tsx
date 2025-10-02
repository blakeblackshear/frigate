import { MutableRefObject, useCallback, useEffect, useMemo } from "react";

export type KeyModifiers = {
  down: boolean;
  repeat: boolean;
  ctrl: boolean;
  shift: boolean;
};

export default function useKeyboardListener(
  keys: string[],
  listener?: (key: string | null, modifiers: KeyModifiers) => boolean,
  contentRef?: MutableRefObject<HTMLDivElement | null>,
) {
  const pageKeys = useMemo(
    () =>
      contentRef != undefined
        ? ["ArrowDown", "ArrowUp", "PageDown", "PageUp"]
        : [],
    [contentRef],
  );

  const keyDownListener = useCallback(
    (e: KeyboardEvent) => {
      // @ts-expect-error we know this field exists
      if (!e || e.target.tagName == "INPUT") {
        return;
      }

      const modifiers = {
        down: true,
        repeat: e.repeat,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
      };

      if (contentRef && pageKeys.includes(e.key)) {
        switch (e.key) {
          case "ArrowDown":
            contentRef.current?.scrollBy({
              top: 100,
              behavior: "smooth",
            });
            break;
          case "ArrowUp":
            contentRef.current?.scrollBy({
              top: -100,
              behavior: "smooth",
            });
            break;
          case "PageDown":
            contentRef.current?.scrollBy({
              top: contentRef.current.clientHeight / 2,
              behavior: "smooth",
            });
            break;
          case "PageUp":
            contentRef.current?.scrollBy({
              top: -contentRef.current.clientHeight / 2,
              behavior: "smooth",
            });
            break;
        }
      } else if (keys.includes(e.key) && listener) {
        const preventDefault = listener(e.key, modifiers);
        if (preventDefault) e.preventDefault();
      } else if (
        listener &&
        (e.key === "Shift" || e.key === "Control" || e.key === "Meta")
      ) {
        listener(null, modifiers);
      }
    },
    [keys, pageKeys, listener, contentRef],
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

      if (listener && keys.includes(e.key)) {
        const preventDefault = listener(e.key, modifiers);
        if (preventDefault) e.preventDefault();
      } else if (
        listener &&
        (e.key === "Shift" || e.key === "Control" || e.key === "Meta")
      ) {
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
