import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWsMessageSubscribe, WsFeedMessage } from "@/api/ws";
import { extractCameraName } from "@/utils/wsUtil";

type UseWsMessageBufferReturn = {
  messages: WsFeedMessage[];
  clear: () => void;
};

type MessageFilter = {
  cameraFilter?: string | string[]; // "all", specific camera name, or array of camera names (undefined in array = all)
};

export function useWsMessageBuffer(
  maxSize: number = 2000,
  paused: boolean = false,
  filter?: MessageFilter,
): UseWsMessageBufferReturn {
  const bufferRef = useRef<WsFeedMessage[]>([]);
  const [version, setVersion] = useState(0);
  const pausedRef = useRef(paused);
  const filterRef = useRef(filter);

  pausedRef.current = paused;
  filterRef.current = filter;

  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    batchTimerRef.current = setInterval(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        setVersion((v) => v + 1);
      }
    }, 200);

    return () => {
      if (batchTimerRef.current) {
        clearInterval(batchTimerRef.current);
      }
    };
  }, []);

  const shouldIncludeMessage = useCallback((msg: WsFeedMessage): boolean => {
    const currentFilter = filterRef.current;
    if (!currentFilter) return true;

    // Check camera filter
    const cf = currentFilter.cameraFilter;
    if (cf !== undefined) {
      if (Array.isArray(cf)) {
        // Array of cameras: include messages matching any camera in the list
        const msgCamera = extractCameraName(msg);
        if (msgCamera && !cf.includes(msgCamera)) {
          return false;
        }
      } else if (cf !== "all") {
        // Single string camera filter
        const msgCamera = extractCameraName(msg);
        if (msgCamera !== cf) {
          return false;
        }
      }
    }

    return true;
  }, []);

  useWsMessageSubscribe(
    useCallback(
      (msg: WsFeedMessage) => {
        if (pausedRef.current) return;
        if (!shouldIncludeMessage(msg)) return;

        const buf = bufferRef.current;
        buf.push(msg);
        if (buf.length > maxSize) {
          buf.splice(0, buf.length - maxSize);
        }
        dirtyRef.current = true;
      },
      [shouldIncludeMessage, maxSize],
    ),
  );

  const clear = useCallback(() => {
    bufferRef.current = [];
    setVersion((v) => v + 1);
  }, []);

  // version is used to trigger re-renders; we spread the buffer
  // into a new array so that downstream useMemo dependencies
  // see a new reference and recompute.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const messages = useMemo(() => [...bufferRef.current], [version]);

  return { messages, clear };
}
