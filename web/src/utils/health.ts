import type { TFunction } from "i18next";
import type {
  DetectionHardware,
  HwaccelRecommendation,
} from "@/types/hardware";
import type {
  CameraConfig,
  DetectionModelConfig,
  FrigateConfig,
} from "@/types/frigateConfig";
import type { FrigateStats, GpuVendor } from "@/types/stats";
import { InferenceThreshold } from "@/types/graph";
import { summarizeDevices } from "@/utils/detectionHardware";
import { isReplayCamera } from "@/utils/cameraUtil";
import { resolveCameraName } from "@/hooks/use-camera-friendly-name";

export type HealthState = "ok" | "warning" | "error" | "unknown";

export type HardwareRow = {
  id: string;
  state: HealthState;
  label: string;
  /** muted text on the label line, what is actually running */
  detail?: string;
  /** reason line under the label, colored by state */
  message?: string;
};

/** seconds after startup during which stats-based rules report unknown */
export const STARTUP_WINDOW_S = 120;

// ---------------------------------------------------------------- detection

/**
 * Detector runner names exactly as the backend's runner_names() builds them:
 * every model's devices in config order, first occurrence is the raw device
 * string, the Nth repeat is "raw#N".
 */
export function runnerNames(models: DetectionModelConfig[]): string[] {
  const counts = new Map<string, number>();
  const names: string[] = [];

  models.forEach((model) => {
    model.devices.forEach((raw) => {
      const count = (counts.get(raw) ?? 0) + 1;
      counts.set(raw, count);
      names.push(count === 1 ? raw : `${raw}#${count}`);
    });
  });

  return names;
}

/** detectors the probe reports; anything else cannot be checked for presence */
export const PROBED_DETECTORS = new Set([
  "cpu",
  "edgetpu",
  "hailo8l",
  "memryx",
  "openvino",
  "onnx",
  "tensorrt",
  "rknn",
  "axengine",
  "synaptics",
]);

/** detectors that fall back to the CPU when no accelerator is present */
const CPU_FALLBACK_DETECTORS = new Set(["onnx", "openvino"]);

export type DevicePresence = "present" | "unverified" | "absent";

/**
 * Whether a configured device string was found by the hardware probe.
 * "unverified" means the detector's hardware is present but the probe does
 * not enumerate this particular device (openvino:AUTO, rknn:0), so it must
 * not be reported as missing.
 */
export function devicePresence(
  device: string,
  hardware: DetectionHardware[],
): DevicePresence {
  const [detector, ...rest] = device.split(":");
  const devicePart = rest.join(":");

  if (detector === "cpu" || devicePart.toUpperCase() === "CPU") {
    return "present";
  }

  if (!PROBED_DETECTORS.has(detector)) {
    return "unverified";
  }

  const entries = hardware.filter((entry) => entry.detector === detector);
  const generic = devicePart === "" || devicePart.toUpperCase() === "AUTO";

  if (entries.length === 0) {
    // a bare onnx or openvino runs on the CPU when nothing is attached, so
    // an empty probe is not proof of missing hardware for those
    return generic && CPU_FALLBACK_DETECTORS.has(detector)
      ? "unverified"
      : "absent";
  }

  if (generic) {
    return "present";
  }

  const unitMatch = entries.some((entry) =>
    entry.units.some(
      (unit) =>
        unit.device === device ||
        unit.device.startsWith(`${device}:`) ||
        unit.device.startsWith(`${device}.`),
    ),
  );

  return unitMatch ? "present" : "unverified";
}

type DetectionArgs = {
  models: DetectionModelConfig[];
  hardware: DetectionHardware[] | undefined;
  probeFailed: boolean;
  stats: FrigateStats | undefined;
  startup: boolean;
  t: TFunction;
};

export function detectionRows({
  models,
  hardware,
  probeFailed,
  stats,
  startup,
  t,
}: DetectionArgs): HardwareRow[] {
  const names = runnerNames(models);
  let cursor = 0;

  return models.map((model, index) => {
    const modelRunners = names.slice(cursor, cursor + model.devices.length);
    cursor += model.devices.length;

    const label = t(`detectionModels.scenes.${model.scene || "all"}`, {
      ns: "views/settings",
    });
    const id = `detection:${index}`;
    const detail = probeFailed
      ? t("health.hardware.probeUnavailable", {
          ns: "views/system",
        })
      : summarizeDevices(hardware ?? [], model.devices);

    if (!probeFailed && hardware) {
      const presence = new Map(
        model.devices.map((device) => [
          device,
          devicePresence(device, hardware),
        ]),
      );
      const missing = [...presence]
        .filter(([, state]) => state === "absent")
        .map(([device]) => device);

      if (missing.length > 0) {
        return {
          id,
          state: "error",
          label,
          detail,
          message: t("health.hardware.deviceNotFound", {
            ns: "views/system",
            devices: missing.join(", "),
          }),
        };
      }

      // unverified devices are skipped by the presence rule; the runtime
      // rules below still decide the row
    }

    if (startup || !stats) {
      return {
        id,
        state: "unknown",
        label,
        detail,
        message: t("health.hardware.justStarted", {
          ns: "views/system",
        }),
      };
    }

    const missingRunner = modelRunners.find((name) => !stats.detectors[name]);

    if (missingRunner) {
      return {
        id,
        state: "error",
        label,
        detail,
        message: t("health.hardware.detectorNotRunning", {
          ns: "views/system",
        }),
      };
    }

    const slowest = Math.max(
      ...modelRunners.map((name) => stats.detectors[name].inference_speed),
    );

    if (slowest > InferenceThreshold.error) {
      return {
        id,
        state: "error",
        label,
        detail,
        message: t("health.hardware.inferenceVerySlow", {
          ns: "views/system",
          speed: slowest,
        }),
      };
    }

    if (slowest > InferenceThreshold.warning) {
      return {
        id,
        state: "warning",
        label,
        detail,
        message: t("health.hardware.inferenceSlow", {
          ns: "views/system",
          speed: slowest,
        }),
      };
    }

    return {
      id,
      state: "ok",
      label,
      detail: [
        detail,
        t("health.hardware.inferenceMs", {
          ns: "views/system",
          speed: slowest,
        }),
      ]
        .filter(Boolean)
        .join(" · "),
    };
  });
}

// ------------------------------------------------------------------ hwaccel

export type HwaccelFamilyKey =
  | "nvidia"
  | "vaapi"
  | "intel-qsv"
  | "rkmpp"
  | "jetson"
  | "rpi";

export type HwaccelClass =
  | { kind: "none" }
  | { kind: "custom" }
  | { kind: "preset"; family: HwaccelFamilyKey };

const PRESET_FAMILIES: [string, HwaccelFamilyKey][] = [
  ["preset-nvidia", "nvidia"],
  ["preset-vaapi", "vaapi"],
  ["preset-intel-qsv", "intel-qsv"],
  ["preset-rk", "rkmpp"],
  ["preset-jetson", "jetson"],
  ["preset-rpi", "rpi"],
];

export function hwaccelFamily(value: string | string[]): HwaccelClass {
  if (Array.isArray(value)) {
    return value.length === 0 ? { kind: "none" } : { kind: "custom" };
  }

  // the backend resolves global and camera auto at startup; a literal auto
  // left on an input means no hardware decoding for it at runtime
  if (value === "" || value === "auto") {
    return { kind: "none" };
  }

  const match = PRESET_FAMILIES.find(([prefix]) => value.startsWith(prefix));
  return match ? { kind: "preset", family: match[1] } : { kind: "custom" };
}

const FAMILY_VENDORS: Record<HwaccelFamilyKey, GpuVendor[]> = {
  nvidia: ["nvidia"],
  jetson: ["nvidia"],
  "intel-qsv": ["intel"],
  vaapi: ["intel", "amd"],
  rkmpp: ["rockchip"],
  rpi: ["rpi"],
};

function decoderUsage(
  family: HwaccelFamilyKey,
  stats: FrigateStats | undefined,
): string | undefined {
  if (!stats?.gpu_usages) {
    return undefined;
  }

  const entry = Object.values(stats.gpu_usages).find(
    (gpu) =>
      gpu.vendor && FAMILY_VENDORS[family].includes(gpu.vendor) && gpu.dec,
  );
  return entry?.dec;
}

function valueKey(value: string | string[]): string {
  return Array.isArray(value) ? JSON.stringify(value) : value;
}

type HwaccelArgs = {
  config: FrigateConfig;
  hwaccel: HwaccelRecommendation | undefined;
  hwaccelFailed: boolean;
  stats: FrigateStats | undefined;
  t: TFunction;
};

export function hwaccelRows({
  config,
  hwaccel,
  hwaccelFailed,
  stats,
  t,
}: HwaccelArgs): HardwareRow[] {
  const cameras = activeCameras(config);
  const camerasByValue = new Map<
    string,
    { value: string | string[]; cameras: string[] }
  >();

  cameras.forEach((camera) => {
    const values: (string | string[])[] = [camera.ffmpeg.hwaccel_args ?? ""];
    camera.ffmpeg.inputs.forEach((input) => {
      if (input.hwaccel_args && input.hwaccel_args.length > 0) {
        values.push(input.hwaccel_args);
      }
    });

    values.forEach((value) => {
      const key = valueKey(value);
      const entry = camerasByValue.get(key) ?? { value, cameras: [] };
      if (!entry.cameras.includes(camera.name)) {
        entry.cameras.push(camera.name);
      }
      camerasByValue.set(key, entry);
    });
  });

  const familyName = (family: HwaccelFamilyKey | "none") =>
    t(`setupWizard.hwaccel.families.${family}`, { ns: "views/setup" });

  return [...camerasByValue.entries()].map(([key, entry]) => {
    const id = `hwaccel:${key}`;
    const cameraList =
      entry.cameras.length === cameras.length
        ? t("health.hardware.allCameras", {
            ns: "views/system",
          })
        : entry.cameras
            .map((name) => resolveCameraName(config, name))
            .join(", ");
    const classified = hwaccelFamily(entry.value);

    if (hwaccelFailed) {
      return {
        id,
        state: "unknown",
        label:
          classified.kind === "preset" ? familyName(classified.family) : key,
        detail: cameraList,
        message: t("health.hardware.probeUnavailable", {
          ns: "views/system",
        }),
      };
    }

    if (classified.kind === "custom") {
      return {
        id,
        state: "unknown",
        label: t("health.hardware.customArgs", {
          ns: "views/system",
        }),
        detail: cameraList,
        message: t("health.hardware.customArgsNotVerified", {
          ns: "views/system",
        }),
      };
    }

    const available = hwaccel?.available ?? [];

    if (classified.kind === "none") {
      if (available.length > 0 && hwaccel?.recommended) {
        return {
          id,
          state: "warning",
          label: familyName("none"),
          detail: cameraList,
          message: t("health.hardware.hwaccelNotConfigured", {
            ns: "views/system",
            family: familyName(hwaccel.recommended as HwaccelFamilyKey),
          }),
        };
      }

      return { id, state: "ok", label: familyName("none"), detail: cameraList };
    }

    const label = familyName(classified.family);
    const present = available.some(
      (family) => family.key === classified.family,
    );

    // a warning, not an error: the resolved config comes from go2rtc's
    // answer while `available` comes from the device probe, and the two
    // disagree on whole platform families
    if (!present) {
      return {
        id,
        state: "warning",
        label,
        detail: cameraList,
        message: t("health.hardware.hwaccelHardwareMissing", {
          ns: "views/system",
          family: label,
        }),
      };
    }

    const dec = decoderUsage(classified.family, stats);
    const detail = dec
      ? `${cameraList} · ${t("health.hardware.decoderUsage", {
          ns: "views/system",
          usage: dec,
        })}`
      : cameraList;

    return { id, state: "ok", label, detail };
  });
}

// -------------------------------------------------------------- enrichments

const ANY_ACCELERATOR = [
  "onnx:nvidia",
  "onnx:amd",
  "openvino:GPU",
  "openvino:NPU",
  "rknn",
  "tensorrt",
];

/**
 * Probe keys that satisfy a requested device string. AUTO and the implicit
 * defaults accept any accelerator; an explicit override must match its own
 * hardware. Undefined means the string is not one we can check.
 */
export function acceleratorKeysFor(
  requested: string,
  nvidiaOnly: boolean,
): string[] | undefined {
  if (nvidiaOnly) {
    return ["onnx:nvidia"];
  }

  const upper = requested.toUpperCase();

  if (upper === "AUTO") {
    return ANY_ACCELERATOR;
  }

  // ONNX Runtime puts a plain GPU request on whichever GPU it has; only an
  // indexed GPU.n names OpenVINO specifically
  if (upper === "GPU") {
    return ["openvino:GPU", "onnx:nvidia", "onnx:amd"];
  }

  if (/^GPU\.\d+$/.test(upper)) {
    return ["openvino:GPU"];
  }

  if (upper === "NPU") {
    return ["openvino:NPU"];
  }

  if (upper.startsWith("CUDA") || upper.startsWith("TENSORRT")) {
    return ["onnx:nvidia"];
  }

  if (upper.startsWith("ROCM") || upper.startsWith("MIGRAPHX")) {
    return ["onnx:amd"];
  }

  return undefined;
}

function acceleratorPresent(
  hardware: DetectionHardware[] | undefined,
  keys: string[],
): boolean {
  return (hardware ?? []).some((entry) => keys.includes(entry.key));
}

type EnrichmentSpec = {
  id: "semantic_search" | "face_recognition" | "lpr" | "audio_transcription";
  enabled: boolean;
  /** what the config asks for, after the backend's own defaults */
  requested: string;
  explicit: boolean;
  remote: boolean;
  nvidiaOnly: boolean;
  /** runtime device is not reported for this enrichment in v1 */
  presenceOnly: boolean;
};

function enrichmentSpecs(config: FrigateConfig): EnrichmentSpec[] {
  const ss = config.semantic_search;
  const anyCameraTranscribes = Object.values(config.cameras).some(
    (camera) => camera.audio_transcription?.enabled,
  );

  return [
    {
      id: "semantic_search",
      enabled: ss.enabled,
      requested: ss.device ?? (ss.model_size === "large" ? "GPU" : "CPU"),
      explicit: ss.device != null,
      remote: ss.model !== "jinav1" && ss.model !== "jinav2",
      nvidiaOnly: false,
      presenceOnly: false,
    },
    {
      id: "face_recognition",
      enabled: config.face_recognition.enabled,
      requested: config.face_recognition.device ?? "GPU",
      explicit: config.face_recognition.device != null,
      remote: false,
      nvidiaOnly: false,
      presenceOnly: false,
    },
    {
      id: "lpr",
      enabled: config.lpr.enabled,
      requested: config.lpr.device ?? "AUTO",
      explicit: config.lpr.device != null,
      remote: false,
      nvidiaOnly: false,
      presenceOnly: false,
    },
    {
      id: "audio_transcription",
      enabled: config.audio_transcription.enabled || anyCameraTranscribes,
      requested: config.audio_transcription.device ?? "CPU",
      explicit: true,
      remote: false,
      nvidiaOnly: true,
      presenceOnly: true,
    },
  ];
}

type EnrichmentArgs = {
  config: FrigateConfig;
  hardware: DetectionHardware[] | undefined;
  probeFailed: boolean;
  stats: FrigateStats | undefined;
  startup: boolean;
  t: TFunction;
};

export function enrichmentRows({
  config,
  hardware,
  probeFailed,
  stats,
  startup,
  t,
}: EnrichmentArgs): HardwareRow[] {
  return enrichmentSpecs(config)
    .filter((spec) => spec.enabled)
    .map((spec) => {
      const id = `enrichment:${spec.id}`;
      const label = t(`health.hardware.enrichments.${spec.id}`, {
        ns: "views/system",
      });

      if (spec.remote) {
        return {
          id,
          state: "ok",
          label,
          detail: t("health.hardware.remoteProvider", {
            ns: "views/system",
          }),
        };
      }

      if (spec.requested.toUpperCase() === "CPU") {
        return { id, state: "ok", label, detail: "CPU" };
      }

      if (probeFailed) {
        return {
          id,
          state: "unknown",
          label,
          message: t("health.hardware.probeUnavailable", {
            ns: "views/system",
          }),
        };
      }

      // implicit defaults (GPU for face recognition and large semantic
      // search) accept any accelerator; only an explicit override is matched
      // against its own hardware
      const keys = spec.explicit
        ? acceleratorKeysFor(spec.requested, spec.nvidiaOnly)
        : spec.nvidiaOnly
          ? ["onnx:nvidia"]
          : ANY_ACCELERATOR;

      if (!keys) {
        return {
          id,
          state: "unknown",
          label,
          message: t("health.hardware.unrecognizedDevice", {
            ns: "views/system",
          }),
        };
      }

      const present = acceleratorPresent(hardware, keys);
      const runtime = startup
        ? undefined
        : stats?.embeddings?.devices?.[spec.id];
      const runtimeIsCpu = !!runtime && runtime.toUpperCase().includes("CPU");

      // a model that reports an accelerator is proof enough, whatever the
      // probe keys say
      if (runtime && !runtimeIsCpu) {
        return { id, state: "ok", label, detail: runtime };
      }

      if (
        spec.explicit &&
        spec.requested.toUpperCase() !== "AUTO" &&
        hardware &&
        !present
      ) {
        return {
          id,
          state: "error",
          label,
          message: t("health.hardware.acceleratorMissing", {
            ns: "views/system",
            device: spec.requested,
          }),
        };
      }

      if (spec.presenceOnly) {
        return { id, state: "ok", label, detail: spec.requested };
      }

      if (!runtime) {
        return {
          id,
          state: "unknown",
          label,
          message: t("health.hardware.modelNotRunYet", {
            ns: "views/system",
          }),
        };
      }

      if (
        runtimeIsCpu &&
        present &&
        spec.explicit &&
        spec.requested.toUpperCase() !== "AUTO"
      ) {
        return {
          id,
          state: "error",
          label,
          detail: "CPU",
          message: t("health.hardware.fellBackToCpu", {
            ns: "views/system",
            device: spec.requested,
          }),
        };
      }

      if (runtimeIsCpu && present) {
        return {
          id,
          state: "warning",
          label,
          detail: "CPU",
          message: t("health.hardware.cpuDespiteAccelerator", {
            ns: "views/system",
          }),
        };
      }

      return { id, state: "ok", label, detail: runtimeIsCpu ? "CPU" : runtime };
    });
}

// ------------------------------------------------------- camera connections

export type CameraConnectionCell = {
  camera: string;
  quality: "excellent" | "fair" | "poor" | "unusable";
  cameraFps: number;
  expectedFps: number;
  reconnects: number;
  stalls: number;
};

/** enabled, non-replay cameras whose latest connection is not excellent */
export function cameraConnectionCells(
  config: FrigateConfig,
  stats: FrigateStats | undefined,
): CameraConnectionCell[] {
  if (!stats) {
    return [];
  }

  return activeCameras(config)
    .map((camera): CameraConnectionCell | undefined => {
      const cam = stats.cameras[camera.name];

      if (
        !cam ||
        !cam.connection_quality ||
        cam.connection_quality === "excellent"
      ) {
        return undefined;
      }

      return {
        camera: camera.name,
        quality: cam.connection_quality,
        cameraFps: cam.camera_fps,
        expectedFps: cam.expected_fps ?? 0,
        reconnects: cam.reconnects_last_hour ?? 0,
        stalls: cam.stalls_last_hour ?? 0,
      };
    })
    .filter((cell): cell is CameraConnectionCell => cell !== undefined);
}

// --------------------------------------------------------------- helpers

export function activeCameras(config: FrigateConfig): CameraConfig[] {
  return Object.values(config.cameras)
    .filter((camera) => camera.enabled && !isReplayCamera(camera.name))
    .sort((a, b) => a.ui.order - b.ui.order);
}

export function isStartupWindow(stats: FrigateStats | undefined): boolean {
  return !!stats && stats.service.uptime < STARTUP_WINDOW_S;
}
