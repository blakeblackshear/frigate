import React from "react";
import CodeInline from "@theme/CodeInline";
import styles from "../styles.module.css";

interface Props {
  rtspPassword: string;
  timezone: string;
  shmSize: string;
  shmSizeError: boolean;
  onRtspPasswordChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onShmSizeChange: (value: string) => void;
}

export default function OtherOptions({
  rtspPassword,
  timezone,
  shmSize,
  shmSizeError,
  onRtspPasswordChange,
  onTimezoneChange,
  onShmSizeChange,
}: Props) {
  return (
    <div className={styles.formSection}>
      <h4>Other Options</h4>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="dcg-rtsp-password" className={styles.label}>
            RTSP password:
          </label>
          <input
            id="dcg-rtsp-password"
            type="text"
            className={styles.input}
            value={rtspPassword}
            placeholder="password"
            onChange={(e) => onRtspPasswordChange(e.target.value)}
          />
          <p className={styles.helpText}>
            Used as{" "}
            <CodeInline>{"{FRIGATE_RTSP_PASSWORD}"}</CodeInline>{" "}
            in the config file to reference camera stream passwords. This is NOT
            the Frigate login password.
          </p>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="dcg-timezone" className={styles.label}>
            Timezone:
          </label>
          <input
            id="dcg-timezone"
            type="text"
            className={styles.input}
            value={timezone}
            placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC"}
            onChange={(e) => onTimezoneChange(e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="dcg-shm-size" className={styles.label}>
            Shared memory (SHM):
          </label>
          <input
            id="dcg-shm-size"
            type="text"
            className={`${styles.input} ${shmSizeError ? styles.inputError : ""}`}
            value={shmSize}
            placeholder="512mb"
            onChange={(e) => onShmSizeChange(e.target.value)}
          />
          {shmSizeError ? (
            <p className={styles.helpText}>
              ⚠️ Invalid format. Use a number followed by a unit (e.g. 512mb, 1gb)
            </p>
          ) : (
            <p className={styles.helpText}>
              See{" "}
              <a href="/frigate/installation#calculating-required-shm-size">
                calculating required SHM size
              </a>{" "}
              for the correct value.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
