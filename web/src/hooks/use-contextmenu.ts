import { MutableRefObject, useEffect } from "react";
import { isIOS } from "react-device-detect";

export default function useContextMenu(
  ref: MutableRefObject<HTMLDivElement | null>,
  callback: () => void,
) {
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const elem = ref.current;

    if (isIOS) {
      let timeoutId: NodeJS.Timeout;
      const touchStart = () => {
        timeoutId = setTimeout(() => {
          callback();
        }, 610);
      };
      const touchClear = () => {
        clearTimeout(timeoutId);
      };
      elem.addEventListener("touchstart", touchStart);
      elem.addEventListener("touchmove", touchClear);
      elem.addEventListener("touchend", touchClear);

      return () => {
        elem.removeEventListener("touchstart", touchStart);
        elem.removeEventListener("touchmove", touchClear);
        elem.removeEventListener("touchend", touchClear);
      };
    } else {
      const context = (e: MouseEvent) => {
        e.preventDefault();
        callback();
      };
      elem.addEventListener("contextmenu", context);

      return () => {
        elem.removeEventListener("contextmenu", context);
      };
    }
  }, [callback, ref]);
}
