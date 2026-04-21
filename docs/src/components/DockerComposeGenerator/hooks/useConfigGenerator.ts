import { useState, useCallback, useMemo } from "react";
import { deviceMap, hardwareMap, portMap } from "../config";
import { generateDockerCompose } from "../generator";
import type { GeneratorInput } from "../generator";

/**
 * Main hook that holds all form state and generates the Docker Compose output.
 * Configuration is loaded synchronously from build-time generated .ts files.
 */
export function useConfigGenerator() {
  const [deviceId, setDeviceId] = useState("stable");

  const [hardwareEnabled, setHardwareEnabled] = useState<Record<string, boolean>>(() => {
    const defaultDevice = deviceMap.get("stable");
    const initial: Record<string, boolean> = {};
    if (defaultDevice) {
      for (const hwId of defaultDevice.autoHardware) {
        initial[hwId] = true;
      }
    }
    return initial;
  });

  const [portEnabled, setPortEnabled] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const p of portMap.values()) {
      initial[p.id] = p.defaultEnabled;
    }
    return initial;
  });

  const [port5000Confirmed, setPort5000Confirmed] = useState(false);
  const [nvidiaGpuCount, setNvidiaGpuCount] = useState("all");
  const [nvidiaGpuDeviceId, setNvidiaGpuDeviceId] = useState("");
  const [configPath, setConfigPath] = useState("");
  const [mediaPath, setMediaPath] = useState("");
  const [rtspPassword, setRtspPassword] = useState("password");
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC"
  );
  const [shmSize, setShmSize] = useState("512mb");
  const [shmSizeError, setShmSizeError] = useState(false);
  const [gpuDeviceIdError, setGpuDeviceIdError] = useState(false);
  const [configPathError, setConfigPathError] = useState(false);
  const [mediaPathError, setMediaPathError] = useState(false);

  const device = useMemo(() => deviceMap.get(deviceId)!, [deviceId]);

  const selectDevice = useCallback((id: string) => {
    const newDevice = deviceMap.get(id);
    if (!newDevice) return;
    setDeviceId(id);
    setHardwareEnabled(() => {
      const next: Record<string, boolean> = {};
      for (const hwId of newDevice.autoHardware) {
        next[hwId] = true;
      }
      return next;
    });
    setNvidiaGpuCount("all");
    setNvidiaGpuDeviceId("");
    setGpuDeviceIdError(false);
  }, []);

  const toggleHardware = useCallback((hwId: string) => {
    setHardwareEnabled((prev) => ({ ...prev, [hwId]: !prev[hwId] }));
  }, []);

  const togglePort = useCallback((portId: string) => {
    const port = portMap.get(portId);
    if (port?.locked) return;
    setPortEnabled((prev) => {
      const next = { ...prev, [portId]: !prev[portId] };
      if (portId === "5000" && !next[portId]) {
        setPort5000Confirmed(false);
      }
      return next;
    });
  }, []);

  const isHardwareDisabled = useCallback(
    (hwId: string): boolean => {
      const hw = hardwareMap.get(hwId);
      if (!hw) return false;
      return hw.disabledWhen?.includes(deviceId) ?? false;
    },
    [deviceId]
  );

  const validateShmSize = useCallback((value: string): boolean => {
    if (!value) return true;
    return /^\d+(\.\d+)?[bkmgBKMG]{1,2}$/.test(value);
  }, []);

  const validatePath = useCallback((value: string): boolean => {
    if (!value) return true;
    return /^[a-zA-Z0-9_\-/./]+$/.test(value);
  }, []);

  const handleShmSizeChange = useCallback(
    (value: string) => {
      const filtered = value.replace(/[^0-9.bkmgBKMG]/g, "");
      const valid = validateShmSize(filtered);
      setShmSize(filtered);
      setShmSizeError(!valid && filtered !== "");
    },
    [validateShmSize]
  );

  const handleConfigPathChange = useCallback(
    (value: string) => {
      const filtered = value.replace(/[^a-zA-Z0-9_\-/./]/g, "");
      const valid = validatePath(filtered);
      setConfigPath(filtered);
      setConfigPathError(!valid && filtered !== "");
    },
    [validatePath]
  );

  const handleMediaPathChange = useCallback(
    (value: string) => {
      const filtered = value.replace(/[^a-zA-Z0-9_\-/./]/g, "");
      const valid = validatePath(filtered);
      setMediaPath(filtered);
      setMediaPathError(!valid && filtered !== "");
    },
    [validatePath]
  );

  const handleNvidiaGpuCountChange = useCallback((value: string) => {
    const lower = value.trim().toLowerCase();
    if (lower === "all" || lower === "" || /^[0-9]+$/.test(lower)) {
      setNvidiaGpuCount(lower || "all");
      if (lower === "all") {
        setNvidiaGpuDeviceId("");
        setGpuDeviceIdError(false);
      } else if (/^[0-9]+$/.test(lower)) {
        setGpuDeviceIdError(false);
      }
    }
  }, []);

  const handleNvidiaGpuDeviceIdChange = useCallback((value: string) => {
    setNvidiaGpuDeviceId(value.trim());
    setGpuDeviceIdError(false);
  }, []);

  const enabledPortLines = useMemo(() => {
    const lines: string[] = [];
    for (const [id, enabled] of Object.entries(portEnabled)) {
      if (!enabled) continue;
      if (id === "5000" && !port5000Confirmed) continue;
      const p = portMap.get(id);
      if (!p) continue;
      const proto = p.protocol && p.protocol !== "tcp" ? `/${p.protocol}` : "";
      const comment = p.description ? ` # ${p.description}` : "";
      lines.push(`      - "${p.host}:${p.container}${proto}"${comment}`);
    }
    return lines;
  }, [portEnabled, port5000Confirmed]);

  const selectedHardwareIds = useMemo(() => {
    return Object.entries(hardwareEnabled)
      .filter(([id, enabled]) => {
        if (!enabled) return false;
        const hw = hardwareMap.get(id);
        if (!hw) return false;
        if (hw.disabledWhen?.includes(deviceId)) return false;
        return true;
      })
      .map(([id]) => id);
  }, [hardwareEnabled, deviceId]);

  const generatedYaml = useMemo(() => {
    const input: GeneratorInput = {
      device,
      selectedHardware: selectedHardwareIds,
      enabledPorts: enabledPortLines,
      configPath: configPath || "/path/to/your/config",
      mediaPath: mediaPath || "/path/to/your/storage",
      rtspPassword: rtspPassword || "password",
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC",
      shmSize: shmSize || "512mb",
      nvidiaGpuCount,
      nvidiaGpuDeviceId,
    };
    return generateDockerCompose(input);
  }, [
    device, selectedHardwareIds, enabledPortLines,
    configPath, mediaPath, rtspPassword, timezone, shmSize,
    nvidiaGpuCount, nvidiaGpuDeviceId,
  ]);

  const hasAnyHardware = selectedHardwareIds.length > 0 || !!device?.devices?.length;

  return {
    deviceId, device, hardwareEnabled, portEnabled,
    port5000Confirmed, nvidiaGpuCount, nvidiaGpuDeviceId,
    configPath, mediaPath, rtspPassword, timezone, shmSize,
    shmSizeError, gpuDeviceIdError, configPathError, mediaPathError,
    hasAnyHardware, generatedYaml,
    selectDevice, toggleHardware, togglePort, setPort5000Confirmed,
    handleShmSizeChange, handleConfigPathChange, handleMediaPathChange,
    handleNvidiaGpuCountChange, handleNvidiaGpuDeviceIdChange,
    setRtspPassword, setTimezone, isHardwareDisabled,
  };
}
