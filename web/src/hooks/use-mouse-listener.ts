import { MutableRefObject, useCallback, useEffect, useState } from "react";
import { isMobile } from "react-device-detect";

export function useScrollLockout(ref: MutableRefObject<HTMLElement | null>) {
  const [scrollLock, setScrollLockout] = useState(false);

  const onScroll = useCallback(() => {
    if (!scrollLock) {
      setScrollLockout(true);
    }
  }, [scrollLock, setScrollLockout]);
  const onMouseMove = useCallback(() => {
    if (scrollLock) {
      setScrollLockout(false);
    }
  }, [scrollLock, setScrollLockout]);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    if (!ref.current) {
      return;
    }

    const content = ref.current;
    content.addEventListener("scroll", onScroll);
    content.addEventListener("mousemove", onMouseMove);

    return () => {
      content.removeEventListener("scroll", onScroll);
      content.removeEventListener("mousemove", onMouseMove);
    };
  }, [ref, onScroll, onMouseMove]);

  return scrollLock;
}
