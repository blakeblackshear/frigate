import { baseUrl } from "./baseUrl";
import { ReactNode, useCallback, useEffect, useRef } from "react";
import { WsSendContext } from "./wsContext";
import type { Update } from "./wsContext";
import {
  invalidateCameraActivityCache,
  processWsMessage,
  resetWsStore,
} from "./ws";

export function WsProvider({ children }: { children: ReactNode }) {
  const wsUrl = `${baseUrl.replace(/^http/, "ws")}ws`;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const unmounted = useRef(false);
  const pendingSends = useRef<Map<string, unknown>>(new Map());

  const sendJsonMessage = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else if (msg && typeof msg === "object" && "topic" in msg) {
      // Sends issued before the socket reaches OPEN (or during a reconnect
      // window) are buffered here and flushed in onopen
      pendingSends.current.set(String((msg as { topic: unknown }).topic), msg);
    }
  }, []);

  useEffect(() => {
    unmounted.current = false;
    const queue = pendingSends.current;

    function connect() {
      if (unmounted.current) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempt.current = 0;
        // events may have been missed while disconnected — the snapshot
        // requested below must fully apply even if byte-identical
        invalidateCameraActivityCache();
        ws.send(
          JSON.stringify({ topic: "onConnect", message: "", retain: false }),
        );
        for (const queued of queue.values()) {
          ws.send(JSON.stringify(queued));
        }
        queue.clear();
      };

      ws.onmessage = (event: MessageEvent) => {
        processWsMessage(event.data as string);
      };

      ws.onclose = () => {
        if (unmounted.current) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30000);
        reconnectAttempt.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
      queue.clear();
      resetWsStore();
    };
  }, [wsUrl]);

  const send = useCallback(
    (message: Update) => {
      sendJsonMessage({
        topic: message.topic,
        payload: message.payload,
        retain: message.retain,
      });
    },
    [sendJsonMessage],
  );

  return (
    <WsSendContext.Provider value={send}>{children}</WsSendContext.Provider>
  );
}
