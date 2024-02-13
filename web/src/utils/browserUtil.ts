import { useMemo } from "react";

export function isSafari() {
  return useMemo(() => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }, []);
}
