import React from "react";
import Admonition from "@theme/Admonition";
import DeviceSelector from "./components/DeviceSelector";
import HardwareOptions from "./components/HardwareOptions";
import PortConfigSection from "./components/PortConfig";
import StoragePaths from "./components/StoragePaths";
import NvidiaGpuConfig from "./components/NvidiaGpuConfig";
import OtherOptions from "./components/OtherOptions";
import GeneratedOutput from "./components/GeneratedOutput";
import { useConfigGenerator } from "./hooks/useConfigGenerator";
import styles from "./styles.module.css";

/**
 * Simple markdown-link-to-React renderer for help text.
 * Only supports [text](url) syntax — no nested brackets.
 */
function renderHelpText(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return (
        <a key={i} href={match[2]}>
          {match[1]}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function DockerComposeGenerator() {
  const {
    deviceId, device, hardwareEnabled,
    portEnabled,
    nvidiaGpuCount, nvidiaGpuDeviceId,
    configPath, mediaPath, rtspPassword, timezone, shmSize,
    shmSizeError, gpuDeviceIdError, configPathError, mediaPathError,
    hasAnyHardware, generatedYaml,
    selectDevice, toggleHardware, togglePort,
    handleShmSizeChange, handleConfigPathChange, handleMediaPathChange,
    handleNvidiaGpuCountChange, handleNvidiaGpuDeviceIdChange,
    setRtspPassword, setTimezone, isHardwareDisabled,
  } = useConfigGenerator();

  return (
    <div className={styles.generator}>
      <div className={styles.card}>
        <DeviceSelector selectedId={deviceId} onSelect={selectDevice} />

        {device.helpText && (
          <Admonition type={device.helpType || "info"}>
            {renderHelpText(device.helpText)}
          </Admonition>
        )}

        {device.needsNvidiaConfig && (
          <NvidiaGpuConfig
            gpuCount={nvidiaGpuCount}
            gpuDeviceId={nvidiaGpuDeviceId}
            gpuDeviceIdError={gpuDeviceIdError}
            onGpuCountChange={handleNvidiaGpuCountChange}
            onGpuDeviceIdChange={handleNvidiaGpuDeviceIdChange}
          />
        )}

        <HardwareOptions
          deviceId={deviceId}
          hardwareEnabled={hardwareEnabled}
          onToggle={toggleHardware}
          isDisabled={isHardwareDisabled}
        />

        <StoragePaths
          configPath={configPath}
          mediaPath={mediaPath}
          configPathError={configPathError}
          mediaPathError={mediaPathError}
          onConfigPathChange={handleConfigPathChange}
          onMediaPathChange={handleMediaPathChange}
        />

        <PortConfigSection
          portEnabled={portEnabled}
          onTogglePort={togglePort}
        />

        <OtherOptions
          rtspPassword={rtspPassword}
          timezone={timezone}
          shmSize={shmSize}
          shmSizeError={shmSizeError}
          onRtspPasswordChange={setRtspPassword}
          onTimezoneChange={setTimezone}
          onShmSizeChange={handleShmSizeChange}
        />

        <GeneratedOutput
          yaml={generatedYaml}
          configPath={configPath}
          mediaPath={mediaPath}
          hasAnyHardware={hasAnyHardware}
          deviceId={deviceId}
        />
      </div>
    </div>
  );
}
