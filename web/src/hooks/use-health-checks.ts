import { useCallback, useSyncExternalStore } from "react";
import axios from "axios";
import useSWR, { useSWRConfig } from "swr";
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

type HealthChecksState = {
  stream: {
    results?: StreamCheckResults;
    /** cameras still being probed in the current run */
    pending: string[];
    /** camera count of the current run */
    total: number;
  };
  hardware: {
    rechecking: boolean;
    /** last on-demand probe; absent means the startup probe is current */
    probedAt?: number;
  };
};

// The tab bar button and both panes read this, so it lives outside React
// and survives tab switches until reload. SWR is not used because a null
// fetcher falls back to the global one and would GET /api/health/...
let state: HealthChecksState = {
  stream: { pending: [], total: 0 },
  hardware: { rechecking: false },
};
const listeners = new Set<() => void>();
let streamRunning = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState() {
  return state;
}

function update(patch: (current: HealthChecksState) => HealthChecksState) {
  state = patch(state);
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

async function runStreamChecks(config: FrigateConfig) {
  if (streamRunning) {
    return;
  }

  streamRunning = true;
  const cameras = activeCameras(config);
  const names = cameras.map((camera) => camera.name);
  update((s) => ({
    ...s,
    stream: { ...s.stream, pending: names, total: names.length },
  }));
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
      update((s) => ({
        ...s,
        stream: {
          ...s.stream,
          pending: s.stream.pending.filter((c) => c !== camera.name),
        },
      }));
    }
  };

  try {
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, cameras.length) }, worker),
    );
    update((s) => ({
      ...s,
      stream: {
        ...s.stream,
        results: { checkedAt: Date.now() / 1000, byCamera },
      },
    }));
  } finally {
    streamRunning = false;
  }
}

export function useHealthChecks() {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const { mutate } = useSWRConfig();
  const current = useSyncExternalStore(subscribe, getState);

  const run = useCallback(() => {
    if (config) {
      return runStreamChecks(config);
    }
  }, [config]);

  const recheck = useCallback(async () => {
    if (state.hardware.rechecking) {
      return;
    }

    update((s) => ({ ...s, hardware: { ...s.hardware, rechecking: true } }));
    try {
      await axios.get("hardware/probe", { params: { refresh: true } });
      await Promise.all([mutate("hardware/probe"), mutate("hardware/hwaccel")]);
      update((s) => ({
        ...s,
        hardware: { rechecking: false, probedAt: Date.now() / 1000 },
      }));
    } catch {
      update((s) => ({ ...s, hardware: { ...s.hardware, rechecking: false } }));
    }
  }, [mutate]);

  const runAll = useCallback(
    () => Promise.all([recheck(), run()]),
    [recheck, run],
  );

  return {
    stream: {
      ...current.stream,
      running: current.stream.pending.length > 0,
      run,
    },
    hardware: { ...current.hardware, recheck },
    runAll,
    ready: !!config,
  };
}
