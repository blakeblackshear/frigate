import { baseUrl } from "@/api/baseUrl";

/**
 * Performs a real WebRTC handshake against go2rtc to verify that a media
 * connection can actually be established (validates candidates, port 8555
 * reachability, and STUN/TURN end-to-end). A success is cached for the page
 * session, a failure only for PROBE_FAILURE_TTL_MS.
 */

export type WebRTCProbeResult = {
  ok: boolean;
  detail?: string;
  // go2rtc could not open the stream's source, which says nothing about
  // whether WebRTC itself can connect
  streamError?: boolean;
};

const PROBE_FAILURE_TTL_MS = 30_000;

let cachedProbe: {
  promise: Promise<WebRTCProbeResult>;
  failedAt?: number;
} | null = null;

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function runProbe(
  testStream: string,
  iceServers: RTCIceServer[],
  timeoutMs: number,
): Promise<WebRTCProbeResult> {
  return new Promise<WebRTCProbeResult>((resolve) => {
    let settled = false;
    const wsURL = `${baseUrl.replace(/^http/, "ws")}live/webrtc/api/ws?src=${testStream}`;

    const pc = new RTCPeerConnection({
      bundlePolicy: "max-bundle",
      iceServers,
    });
    let ws: WebSocket | null = null;

    const cleanup = (result: WebRTCProbeResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        // ignore
      }
      try {
        pc.close();
      } catch {
        // ignore
      }
      resolve(result);
    };

    const fail = (detail: string) => cleanup({ ok: false, detail });

    const timer = setTimeout(
      () => fail(`no ICE connection within ${timeoutMs}ms`),
      timeoutMs,
    );

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === "connected" || state === "completed") {
        cleanup({ ok: true });
      } else if (state === "failed" || state === "closed") {
        fail(`ICE connection state: ${state}`);
      }
    };

    pc.addTransceiver("video", { direction: "recvonly" });

    try {
      ws = new WebSocket(wsURL);
    } catch (err) {
      fail(`WebSocket to go2rtc could not be opened: ${describeError(err)}`);
      return;
    }

    ws.addEventListener("error", () => fail("WebSocket to go2rtc errored"));

    ws.addEventListener("open", () => {
      pc.addEventListener("icecandidate", (ev) => {
        if (!ev.candidate || !ws) return;
        ws.send(
          JSON.stringify({
            type: "webrtc/candidate",
            value: ev.candidate.candidate,
          }),
        );
      });

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          ws?.send(
            JSON.stringify({
              type: "webrtc/offer",
              value: pc.localDescription?.sdp,
            }),
          );
        })
        .catch((err) =>
          fail(`failed to create the local offer: ${describeError(err)}`),
        );
    });

    ws.addEventListener("message", (ev) => {
      let msg: { type: string; value: string };
      try {
        msg = JSON.parse((ev as MessageEvent).data);
      } catch {
        return;
      }
      if (msg.type === "webrtc/candidate") {
        pc.addIceCandidate({ candidate: msg.value, sdpMid: "0" }).catch((err) =>
          fail(`remote ICE candidate rejected: ${describeError(err)}`),
        );
      } else if (msg.type === "webrtc/answer") {
        pc.setRemoteDescription({ type: "answer", sdp: msg.value }).catch(
          (err) => fail(`remote answer rejected: ${describeError(err)}`),
        );
      } else if (msg.type === "error") {
        cleanup({ ok: false, streamError: true, detail: msg.value });
      }
    });
  });
}

async function runProbes(
  testStreams: string[],
  iceServers: RTCIceServer[],
  timeoutMs: number,
): Promise<WebRTCProbeResult> {
  let result: WebRTCProbeResult = { ok: false, detail: "no stream to probe" };

  for (const stream of testStreams) {
    result = await runProbe(stream, iceServers, timeoutMs);

    if (!result.ok) {
      result.detail = `stream '${stream}': ${result.detail}`;
    }

    if (!result.streamError) {
      break;
    }
  }

  return result;
}

/** Probes the streams in order, moving on only when go2rtc refuses one. */
export function probeWebRTCAvailability(
  testStreams: string[],
  iceServers: RTCIceServer[],
  timeoutMs: number = 5000,
): Promise<WebRTCProbeResult> {
  if (
    cachedProbe &&
    (cachedProbe.failedAt === undefined ||
      Date.now() - cachedProbe.failedAt < PROBE_FAILURE_TTL_MS)
  ) {
    return cachedProbe.promise;
  }

  const entry: NonNullable<typeof cachedProbe> = {
    promise: runProbes(testStreams, iceServers, timeoutMs)
      .catch((err): WebRTCProbeResult => ({
        ok: false,
        detail: describeError(err),
      }))
      .then((result) => {
        if (!result.ok) {
          entry.failedAt = Date.now();
        }
        return result;
      }),
  };
  cachedProbe = entry;
  return entry.promise;
}

/** Clears the cached probe result (e.g. when go2rtc config changes). */
export function resetWebRTCProbe(): void {
  cachedProbe = null;
}
