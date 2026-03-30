import React from "react";

export default function NavPath({ path }) {
  const segments = path.split(" > ");
  return (
    <span
      style={{
        display: "inline",
        fontSize: "inherit",
        lineHeight: "inherit",
      }}
    >
      {segments.map((seg, i) => (
        <span key={i}>
          {i > 0 && (
            <span
              style={{
                margin: "0 4px",
                color: "var(--ifm-color-emphasis-800)",
              }}
            >
              →
            </span>
          )}
          <strong>{seg}</strong>
        </span>
      ))}
    </span>
  );
}
