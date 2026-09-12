import type {
  DeviceConfig,
  DeviceMapping,
  VolumeMapping,
} from "../config/types";
import { hardwareMap } from "../config";

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface GeneratorInput {
  device: DeviceConfig;
  selectedHardware: string[];
  enabledPorts: string[];
  configPath: string;
  mediaPath: string;
  rtspPassword?: string;
  timezone: string;
  shmSize: string;
  nvidiaGpuCount?: string;
  nvidiaGpuDeviceId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deviceLine(dm: DeviceMapping): string {
  const host = dm.host;
  const container = dm.container ?? dm.host;
  const mapping = host === container ? host : `${host}:${container}`;
  const comment = dm.comment ? ` # ${dm.comment}` : "";
  return `      - ${mapping}${comment}`;
}

function volumeLine(vm: VolumeMapping): string {
  const ro = vm.readOnly ? ":ro" : "";
  const comment = vm.comment ? ` # ${vm.comment}` : "";
  return `      - ${vm.host}:${vm.container}${ro}${comment}`;
}

// ---------------------------------------------------------------------------
// YAML builder — each section returns an array of lines
// ---------------------------------------------------------------------------

function buildImage(device: DeviceConfig): string[] {
  const tag = device.imageTagSuffix
    ? `${device.imageTag}${device.imageTagSuffix}`
    : device.imageTag;
  return [`    image: ghcr.io/blakeblackshear/frigate:${tag}`];
}

function buildDevices(
  device: DeviceConfig,
  hwDevices: DeviceMapping[]
): string[] {
  const all: DeviceMapping[] = [
    ...(device.devices ?? []),
    ...hwDevices,
  ];
  if (all.length === 0) return [];
  return [
    "    devices:",
    ...all.map(deviceLine),
  ];
}

function buildVolumes(
  device: DeviceConfig,
  hwVolumes: VolumeMapping[],
  configPath: string,
  mediaPath: string
): string[] {
  const all: VolumeMapping[] = [
    ...(device.volumes ?? []),
    ...hwVolumes,
  ];
  return [
    "    volumes:",
    "      - /etc/localtime:/etc/localtime:ro # Sync host time",
    `      - ${configPath}:/config # Config file directory`,
    `      - ${mediaPath}:/media/frigate # Recording storage directory`,
    "      - type: tmpfs # 1GB in-memory filesystem for recording segment storage",
    "        target: /tmp/cache",
    "        tmpfs:",
    "          size: 1000000000",
    ...all.map(volumeLine),
  ];
}

function buildPorts(enabledPorts: string[]): string[] {
  return [
    "    ports:",
    ...enabledPorts,
  ];
}

function buildEnvironment(
  device: DeviceConfig,
  hwEnv: Record<string, string>,
  rtspPassword: string | undefined,
  timezone: string
): string[] {
  const allEnv: Record<string, string> = {
    ...hwEnv,
    ...(device.env ?? {}),
  };

  const lines: string[] = ["    environment:"];

  if (rtspPassword) {
    lines.push(
      `      FRIGATE_RTSP_PASSWORD: "${rtspPassword}" # RTSP password — change to your own`
    );
  }

  lines.push(`      TZ: "${timezone}" # Timezone`);

  for (const [key, value] of Object.entries(allEnv)) {
    lines.push(`      ${key}: "${value}"`);
  }

  return lines;
}

function buildDeploy(device: DeviceConfig, input: GeneratorInput): string[] {
  if (device.id === "stable-tensorrt") {
    const count = input.nvidiaGpuCount || "all";
    const isAll = count === "all";
    const deviceId = input.nvidiaGpuDeviceId?.trim();

    if (isAll) {
      return [
        "    deploy:",
        "      resources:",
        "        reservations:",
        "          devices:",
        "            - driver: nvidia",
        "              count: all # Use all GPUs",
        "              capabilities: [gpu]",
      ];
    }

    if (deviceId) {
      const ids = deviceId
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `'${s}'`)
        .join(", ");
      return [
        "    deploy:",
        "      resources:",
        "        reservations:",
        "          devices:",
        "            - driver: nvidia",
        `              device_ids: [${ids}] # GPU device IDs`,
        `              count: ${count} # GPU count`,
        "              capabilities: [gpu]",
      ];
    }

    return [
      "    deploy:",
      "      resources:",
      "        reservations:",
      "          devices:",
      "            - driver: nvidia",
      `              count: ${count} # GPU count`,
      "              capabilities: [gpu]",
    ];
  }

  return [];
}

function buildRuntime(device: DeviceConfig): string[] {
  if (device.runtime) {
    return [`    runtime: ${device.runtime}`];
  }
  return [];
}

function buildExtraHosts(device: DeviceConfig): string[] {
  if (!device.extraHosts?.length) return [];
  return [
    "    extra_hosts:",
    ...device.extraHosts.map(
      (h, i) =>
        `      - "${h}"${i === 0 ? " # Required to talk to the NPU detector" : ""}`
    ),
  ];
}

function buildSecurityOpt(device: DeviceConfig): string[] {
  if (!device.securityOpt?.length) return [];
  return [
    "    security_opt:",
    ...device.securityOpt.map((s) => `      - ${s}`),
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a docker-compose YAML string from the given input.
 * The output is pure YAML with inline comments (no Shiki annotations).
 */
export function generateDockerCompose(input: GeneratorInput): string {
  const { device } = input;

  // Collect hardware-level devices, volumes, and env
  const hwDevices: DeviceMapping[] = [];
  const hwVolumes: VolumeMapping[] = [];
  const hwEnv: Record<string, string> = {};

  for (const hwId of input.selectedHardware) {
    const hw = hardwareMap.get(hwId);
    if (!hw) continue;
    // Skip GPU device mapping for tensorrt images (it uses deploy instead)
    if (hw.id === "gpu" && device.imageTag === "stable-tensorrt") continue;
    hwDevices.push(...(hw.devices ?? []));
    hwVolumes.push(...(hw.volumes ?? []));
    Object.assign(hwEnv, hw.env ?? {});
  }

  const lines: string[] = [
    "services:",
    "  frigate:",
    "    container_name: frigate",
    "    privileged: true # This may not be necessary for all setups",
    "    restart: unless-stopped",
    "    stop_grace_period: 30s # Allow enough time to shut down the various services",
    ...buildImage(device),
    `    shm_size: "${input.shmSize || "512mb"}" # Update for your cameras based on SHM calculation`,
    ...buildRuntime(device),
    ...buildDeploy(device, input),
    ...buildExtraHosts(device),
    ...buildSecurityOpt(device),
    ...buildDevices(device, hwDevices),
    ...buildVolumes(device, hwVolumes, input.configPath, input.mediaPath),
    ...buildPorts(input.enabledPorts),
    ...buildEnvironment(device, hwEnv, input.rtspPassword, input.timezone),
  ];

  return lines.join("\n");
}
