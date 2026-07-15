import React from "react";
import { useColorMode } from "@docusaurus/theme-common";
import { devices } from "../config";
import type { DeviceConfig } from "../config";
import styles from "../styles.module.css";

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Determine the icon type from the icon string:
 * - Starts with "<svg" → inline SVG
 * - Starts with "/" or "http" → image URL/path
 * - Otherwise → emoji text
 */
function getIconType(icon: string): "svg" | "image" | "emoji" {
  const trimmed = icon.trim();
  if (trimmed.startsWith("<svg")) return "svg";
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) return "image";
  return "emoji";
}

/**
 * Check if the style object contains background-* properties,
 * indicating the image should be rendered as a CSS background-image
 * rather than an <img> tag.
 */
function hasBackgroundProps(style: React.CSSProperties | undefined): boolean {
  if (!style) return false;
  return Object.keys(style).some((key) => {
    const k = key.toLowerCase().replace(/-/g, "");
    return k === "backgroundsize" || k === "backgroundposition" || k === "backgroundrepeat" || k === "backgroundimage";
  });
}

/**
 * Convert a style object to CSS custom properties (e.g. { width: "24px" } → { "--svg-width": "24px" })
 * so they can be consumed by CSS rules targeting child elements like <svg>.
 */
function toCssVars(style: React.CSSProperties | undefined, prefix: string): React.CSSProperties {
  if (!style) return {};
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(style)) {
    const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    vars[`--${prefix}-${cssKey}`] = value;
  }
  return vars as React.CSSProperties;
}

function DeviceIcon({ device }: { device: DeviceConfig }) {
  const { isDarkTheme } = useColorMode();
  const iconStr = isDarkTheme && device.iconDark ? device.iconDark : device.icon;
  const iconStyle = (isDarkTheme && device.iconDarkStyle
    ? device.iconDarkStyle
    : device.iconStyle) as React.CSSProperties | undefined;
  const svgStyle = (isDarkTheme && device.svgDarkStyle
    ? device.svgDarkStyle
    : device.svgStyle) as React.CSSProperties | undefined;

  const iconType = getIconType(iconStr);

  if (iconType === "svg") {
    return (
      <div
        className={styles.deviceIconSvg}
        style={{ ...iconStyle, ...toCssVars(svgStyle, "svg") }}
        dangerouslySetInnerHTML={{ __html: iconStr }}
      />
    );
  }

  if (iconType === "image") {
    // When iconStyle contains background-* properties, render as background-image
    // on the container div instead of an <img> tag, enabling background-size/position control.
    if (hasBackgroundProps(iconStyle)) {
      return (
        <div
          className={styles.deviceIconImage}
          style={{
            backgroundImage: `url(${iconStr})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "contain",
            ...iconStyle,
          }}
        />
      );
    }
    return (
      <div className={styles.deviceIconImage}>
        <img src={iconStr} alt={device.name} style={iconStyle} />
      </div>
    );
  }

  return (
    <div className={styles.deviceIcon} style={iconStyle}>
      {iconStr}
    </div>
  );
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
      <DeviceIcon device={device} />
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
