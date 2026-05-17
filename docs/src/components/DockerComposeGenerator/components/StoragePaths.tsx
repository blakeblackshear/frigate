import React from "react";
import styles from "../styles.module.css";

interface Props {
  configPath: string;
  mediaPath: string;
  configPathError: boolean;
  mediaPathError: boolean;
  onConfigPathChange: (value: string) => void;
  onMediaPathChange: (value: string) => void;
}

export default function StoragePaths({
  configPath,
  mediaPath,
  configPathError,
  mediaPathError,
  onConfigPathChange,
  onMediaPathChange,
}: Props) {
  return (
    <div className={styles.formSection}>
      <h4>Storage Paths</h4>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="dcg-config-path" className={styles.label}>
            Config / DB / model cache directory (on your host):
          </label>
          <input
            id="dcg-config-path"
            type="text"
            className={`${styles.input} ${configPathError ? styles.inputError : ""}`}
            value={configPath}
            placeholder="/path/to/your/config"
            onChange={(e) => onConfigPathChange(e.target.value)}
          />
          {configPathError && (
            <p className={styles.helpText}>
              ⚠️ Path contains invalid characters. Only letters, numbers,
              underscores, hyphens, slashes, and dots are allowed.
            </p>
          )}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="dcg-media-path" className={styles.label}>
            Recording storage directory (on your host):
          </label>
          <input
            id="dcg-media-path"
            type="text"
            className={`${styles.input} ${mediaPathError ? styles.inputError : ""}`}
            value={mediaPath}
            placeholder="/path/to/your/storage"
            onChange={(e) => onMediaPathChange(e.target.value)}
          />
          {mediaPathError && (
            <p className={styles.helpText}>
              ⚠️ Path contains invalid characters. Only letters, numbers,
              underscores, hyphens, slashes, and dots are allowed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
