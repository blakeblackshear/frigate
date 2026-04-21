import React from "react";
import { devices } from "../config";
import type { DeviceConfig } from "../config";
import styles from "../styles.module.css";

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

function DeviceCard({
  device,
  active,
  onClick,
}: {
  device: DeviceConfig;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`${styles.deviceCard} ${active ? styles.deviceCardActive : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className={styles.deviceIcon}>{device.icon}</div>
      <div className={styles.deviceName}>{device.name}</div>
      <div className={styles.deviceDesc}>{device.description}</div>
    </div>
  );
}

export default function DeviceSelector({ selectedId, onSelect }: Props) {
  return (
    <div className={styles.formSection}>
      <h4>Device Type</h4>
      <div className={styles.deviceGrid}>
        {devices.map((d) => (
          <DeviceCard
            key={d.id}
            device={d}
            active={selectedId === d.id}
            onClick={() => onSelect(d.id)}
          />
        ))}
      </div>
    </div>
  );
}
