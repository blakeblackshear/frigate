import React from "react";
import Admonition from "@theme/Admonition";
import { ports } from "../config";
import styles from "../styles.module.css";

interface Props {
  portEnabled: Record<string, boolean>;
  onTogglePort: (portId: string) => void;
}

function PortItem({
  port,
  enabled,
  onToggle,
}: {
  port: typeof ports[number];
  enabled: boolean;
  onToggle: () => void;
}) {
  const showWarning = port.warningContent && (
    port.warningWhen === "checked" ? enabled :
    port.warningWhen === "unchecked" ? !enabled : enabled
  );

  return (
    <div className={styles.hardwareItem}>
      <label className={`${styles.checkboxLabel} ${port.locked ? styles.checkboxDisabled : ""}`}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          disabled={port.locked}
        />
        <span>
          {port.locked && "🔒 "}
          Port {port.host}
          {port.protocol !== "tcp" && `/${port.protocol}`}
        </span>
      </label>
      {port.description && (
        <div className={styles.hardwareDescription}>{port.description}</div>
      )}
      {showWarning && (
        <Admonition type={port.warningType || "warning"}>
          {port.warningContent}
        </Admonition>
      )}
    </div>
  );
}

export default function PortConfigSection({
  portEnabled,
  onTogglePort,
}: Props) {
  return (
    <div className={styles.formSection}>
      <h4>Port Configuration</h4>
      <div className={styles.checkboxGrid}>
        {ports.map((port) => (
          <PortItem
            key={port.id}
            port={port}
            enabled={!!portEnabled[port.id]}
            onToggle={() => onTogglePort(port.id)}
          />
        ))}
      </div>
    </div>
  );
}
