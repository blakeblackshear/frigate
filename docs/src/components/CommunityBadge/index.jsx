import React from "react";

export default function CommunityBadge() {
  return (
    <span
      title="This detector is maintained by community members who provide code, maintenance, and support. See the contributing boards documentation for more information."
      style={{
        display: "inline-block",
        backgroundColor: "#f1f3f5",
        color: "#24292f",
        fontSize: "11px",
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: "3px",
        border: "1px solid #d1d9e0",
        marginLeft: "4px",
        cursor: "help",
      }}
    >
      Community Supported
    </span>
  );
}
