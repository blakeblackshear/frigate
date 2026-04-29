import React from "react";
import styles from "../styles.module.css";

interface Props {
  gpuCount: string;
  gpuDeviceId: string;
  gpuDeviceIdError: boolean;
  onGpuCountChange: (value: string) => void;
  onGpuDeviceIdChange: (value: string) => void;
}

export default function NvidiaGpuConfig({
  gpuCount,
  gpuDeviceId,
  gpuDeviceIdError,
  onGpuCountChange,
  onGpuDeviceIdChange,
}: Props) {
  const showDeviceId = gpuCount !== "";

  return (
    <div className={styles.nvidiaConfig}>
      <div className={styles.formGroup}>
        <label htmlFor="dcg-gpu-count" className={styles.label}>
          GPU count:
        </label>
        <input
          id="dcg-gpu-count"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={styles.input}
          value={gpuCount}
          placeholder="all"
          onChange={(e) => onGpuCountChange(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {showDeviceId && (
        <div className={styles.formGroup}>
          <label htmlFor="dcg-gpu-device-id" className={styles.label}>
            GPU device IDs (required, comma-separated):
          </label>
          <input
            id="dcg-gpu-device-id"
            type="text"
            className={`${styles.input} ${gpuDeviceIdError ? styles.inputError : ""}`}
            value={gpuDeviceId}
            placeholder="0"
            onChange={(e) => onGpuDeviceIdChange(e.target.value)}
          />
          {gpuDeviceIdError ? (
            <p className={styles.helpText}>
              ⚠️ GPU device IDs are required when GPU count is a number
            </p>
          ) : (
            <p className={styles.helpText}>
              Single GPU: 0 &nbsp;|&nbsp; Multiple GPUs: 0,1,2
            </p>
          )}
        </div>
      )}
    </div>
  );
}
