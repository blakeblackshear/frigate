import { MutableRefObject } from "react";
import { DEFAULT_HEARTBEAT } from "./constants";
import { HeartbeatOptions } from "./types";

function getLastMessageTime(lastMessageTime: MutableRefObject<number> | MutableRefObject<number>[]): number {
  if (Array.isArray(lastMessageTime)) {
    return lastMessageTime.reduce((p, c) => { return (p.current > c.current) ? p : c; }).current;
  }
  return lastMessageTime.current
}

export function heartbeat(ws: WebSocket, lastMessageTime: MutableRefObject<number> | MutableRefObject<number>[], options?: HeartbeatOptions): () => void {
  const {
    interval = DEFAULT_HEARTBEAT.interval,
    timeout = DEFAULT_HEARTBEAT.timeout,
    message = DEFAULT_HEARTBEAT.message,
  } = options || {};

  // how often check interval between ping messages
  // minimum is 100ms
  // maximum is ${interval / 10}ms
  const intervalCheck = Math.max(100, interval / 10);

  let lastPingSentAt = Date.now();

  const heartbeatInterval = setInterval(() => {
    const timeNow = Date.now();
    const lastMessageReceivedAt = getLastMessageTime(lastMessageTime);
    if (lastMessageReceivedAt + timeout <= timeNow) {
      console.warn(`Heartbeat timed out, closing connection, last message received ${timeNow - lastMessageReceivedAt}ms ago, last ping sent ${timeNow - lastPingSentAt}ms ago`);
      ws.close();
    } else {
      if (lastMessageReceivedAt + interval <= timeNow && lastPingSentAt + interval <= timeNow) {
        try {
          if (typeof message === 'function') {
            ws.send(message());
          } else {
            ws.send(message);
          }
          lastPingSentAt = timeNow;
        } catch (err: unknown) {
          console.error(`Heartbeat failed, closing connection`, err instanceof Error ? err.message : err);
          ws.close();
        }

      }
    }
  }, intervalCheck);

  ws.addEventListener("close", () => {
    clearInterval(heartbeatInterval);
  });

  return () => { };
}
