import React from "react";
import Admonition from "@theme/Admonition";
import { ports } from "../config";
import { useCooldown } from "../hooks/useCooldown";
import styles from "../styles.module.css";

interface Props {
  portEnabled: Record<string, boolean>;
  port5000Confirmed: boolean;
  onTogglePort: (portId: string) => void;
  onConfirm5000: (confirmed: boolean) => void;
}

function Port5000Confirmation({
  portEnabled,
  confirmed,
  onToggle,
  onConfirm,
}: {
  portEnabled: boolean;
  confirmed: boolean;
  onToggle: () => void;
  onConfirm: (confirmed: boolean) => void;
}) {
  const { remaining, start, stop } = useCooldown(10);

  React.useEffect(() => {
    if (portEnabled) {
      start();
    } else {
      stop();
      onConfirm(false);
    }
    return stop;
  }, [portEnabled]);

  return (
    <div className={styles.portSection}>
      {portEnabled && (
        <Admonition type="danger">
          <p>
            Exposing port 5000 allows <strong>unauthenticated access</strong> to
            your Frigate instance. Anyone on your network (or the internet if you
            have a public IP) could access it without credentials.
          </p>
          <p>
            This may lead to <strong>unauthorized access</strong>,{" "}
            <strong>privacy leaks</strong>, or further attacks. Ensure you have
            proper firewall rules or VPN in place.
          </p>
          <label
            className={`${styles.checkboxLabel} ${remaining > 0 ? styles.checkboxDisabled : ""}`}
          >
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => onConfirm(e.target.checked)}
              disabled={remaining > 0}
            />
            <span>
              I understand the risk and confirm enabling port 5000
              {remaining > 0 && ` (${remaining}s)`}
            </span>
          </label>
        </Admonition>
      )}
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={portEnabled}
          onChange={onToggle}
        />
        <span>Port 5000 (unauthenticated access)</span>
        <span className={styles.warningBadge}>⚠️ Expose carefully</span>
      </label>
    </div>
  );
}

export default function PortConfigSection({
  portEnabled,
  port5000Confirmed,
  onTogglePort,
  onConfirm5000,
}: Props) {
  return (
    <div className={styles.formSection}>
      <h4>Port Configuration</h4>

      {/* All ports except 5000 */}
      <div className={styles.checkboxGrid}>
        {ports
          .filter((p) => p.id !== "5000")
          .map((port) => (
            <div key={port.id} className={styles.hardwareItem}>
              <label className={`${styles.checkboxLabel} ${port.locked ? styles.checkboxDisabled : ""}`}>
                <input
                  type="checkbox"
                  checked={!!portEnabled[port.id]}
                  onChange={() => onTogglePort(port.id)}
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
            </div>
          ))}
      </div>

      {/* Port 5000 with special warning — placed last */}
      <Port5000Confirmation
        portEnabled={!!portEnabled["5000"]}
        confirmed={port5000Confirmed}
        onToggle={() => onTogglePort("5000")}
        onConfirm={onConfirm5000}
      />
    </div>
  );
}
