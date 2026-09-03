import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import axios from "axios";
import type { TestResult } from "@/types/cameraWizard";
import type { FrigateConfig } from "@/types/frigateConfig";
import { ffprobeToTestResult, type FfprobeEntry } from "@/utils/streamIssues";
import { activeCameras } from "@/utils/health";

export type CameraStreamCheck = {
  /** whole-camera failure (request error or timeout) */
  error?: string;
  /** one entry per config input, in config order */
  streams: TestResult[];
};

export type StreamCheckResults = {
  checkedAt: number;
  byCamera: Record<string, CameraStreamCheck>;
};

// Results live in a module-level store rather than SWR: SWR with a null
// fetcher falls back to the global fetcher and would GET /api/health/...
// The store survives tab switches and navigation until reload.
let storedResults: StreamCheckResults | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setResults(results: StreamCheckResults) {
  storedResults = results;
  listeners.forEach((listener) => listener());
}

const CONCURRENCY = 2;
// the backend probes each input with a 6 s timeout plus one retry
const TIMEOUT_PER_INPUT_MS = 12_000;
const TIMEOUT_BASE_MS = 5_000;

async function probeCamera(
  name: string,
  inputs: number,
): Promise<CameraStreamCheck> {
  try {
    const response = await axios.get("ffprobe", {
      params: { paths: `camera:${name}`, detailed: true },
      timeout: TIMEOUT_BASE_MS + TIMEOUT_PER_INPUT_MS * Math.max(inputs, 1),
    });
    const entries: FfprobeEntry[] = Array.isArray(response.data)
      ? response.data
      : [];
    return { streams: entries.map(ffprobeToTestResult) };
  } catch (error) {
    const axiosError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return {
      error:
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Connection failed",
      streams: [],
    };
  }
}

export function useStreamChecks(config: FrigateConfig | undefined) {
  const results = useSyncExternalStore(subscribe, () => storedResults);
  const [pending, setPending] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  // a ref, so a double click cannot start a second run from a stale render
  const runningRef = useRef(false);
  const running = pending.length > 0;

  const run = useCallback(async () => {
    if (!config || runningRef.current) {
      return;
    }

    runningRef.current = true;
    const cameras = activeCameras(config);
    const names = cameras.map((camera) => camera.name);
    setTotal(names.length);
    setPending(names);
    const byCamera: Record<string, CameraStreamCheck> = {};
    const queue = [...cameras];

    const worker = async () => {
      while (queue.length > 0) {
        const camera = queue.shift();
        if (!camera) {
          return;
        }
        byCamera[camera.name] = await probeCamera(
          camera.name,
          camera.ffmpeg.inputs.length,
        );
        setPending((prev) => prev.filter((c) => c !== camera.name));
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, cameras.length) }, worker),
      );
      setResults({ checkedAt: Date.now() / 1000, byCamera });
    } finally {
      runningRef.current = false;
    }
  }, [config]);

  return { results, pending, running, total, run };
}
