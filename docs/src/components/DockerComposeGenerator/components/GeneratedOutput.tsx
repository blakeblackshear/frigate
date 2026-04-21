import React, { useState, useCallback } from "react";
import CodeBlock from "@theme/CodeBlock";
import Admonition from "@theme/Admonition";
import styles from "../styles.module.css";

interface Props {
  yaml: string;
  configPath: string;
  mediaPath: string;
  hasAnyHardware: boolean;
  deviceId: string;
}

export default function GeneratedOutput({
  yaml,
  configPath,
  mediaPath,
  hasAnyHardware,
  deviceId,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [yaml]);

  return (
    <div className={styles.resultSection}>
      <div className={styles.resultHeader}>
        <h4>Generated Configuration</h4>
        <button className="button button--primary button--sm" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {!configPath && (
        <Admonition type="tip">
          <p>You haven&apos;t specified a config file directory. You may want to modify the default path.</p>
        </Admonition>
      )}
      {!mediaPath && (
        <Admonition type="tip">
          <p>You haven&apos;t specified a recording storage directory. You may want to modify the default path.</p>
        </Admonition>
      )}
      {deviceId === "stable" && !hasAnyHardware && (
        <Admonition type="warning">
          <p>You haven&apos;t selected any hardware acceleration. Please check if you have supported hardware available.</p>
        </Admonition>
      )}

      <CodeBlock language="yaml" title="docker-compose.yml">
        {yaml}
      </CodeBlock>
    </div>
  );
}
