import React from "react";
import { hardwareOptions } from "../config";
import type { HardwareOption } from "../config";
import styles from "../styles.module.css";

interface Props {
  deviceId: string;
  hardwareEnabled: Record<string, boolean>;
  onToggle: (hwId: string) => void;
  isDisabled: (hwId: string) => boolean;
}

function renderDescription(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return <a key={i} href={match[2]}>{match[1]}</a>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function HardwareCheckbox({
  hw, disabled, checked, onToggle,
}: {
  hw: HardwareOption; disabled: boolean; checked: boolean; onToggle: () => void;
}) {
  return (
    <div className={styles.hardwareItem}>
      <label className={`${styles.checkboxLabel} ${disabled ? styles.checkboxDisabled : ""}`}>
        <input type="checkbox" checked={checked} onChange={onToggle} disabled={disabled} />
        <span>{hw.label}</span>
      </label>
      {checked && hw.description && (
        <div className={styles.hardwareDescription}>{renderDescription(hw.description)}</div>
      )}
    </div>
  );
}

export default function HardwareOptions({ deviceId, hardwareEnabled, onToggle, isDisabled }: Props) {
  return (
    <div className={styles.formSection}>
      <h4>Generic Hardware Devices</h4>
      {deviceId !== "stable" && (
        <p className={styles.helpText}>
          Some options have been auto-configured based on your device type.
        </p>
      )}
      <div className={styles.checkboxGrid}>
        {hardwareOptions.map((hw) => {
          const disabled = isDisabled(hw.id);
          const checked = disabled ? false : !!hardwareEnabled[hw.id];
          return (
            <HardwareCheckbox key={hw.id} hw={hw} disabled={disabled} checked={checked} onToggle={() => onToggle(hw.id)} />
          );
        })}
      </div>
    </div>
  );
}
