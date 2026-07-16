import React, { useState } from "react";
import CodeBlock from "@theme/CodeBlock";
import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import { marked } from "marked";
import styles from "./styles.module.css";

marked.setOptions({ gfm: true });

/**
 * @typedef {Object} Model
 * @property {string} key
 * @property {string} label
 * @property {boolean} recommended
 * @property {string} download Markdown for the "download the model" step.
 * @property {string} ui Markdown for the Frigate UI configuration step.
 * @property {string} yaml Raw YAML for the configuration step.
 */

// Render a markdown string to React nodes. Fenced code blocks become Docusaurus
// CodeBlock components (so they get syntax highlighting and a copy button);
// everything else is marked-parsed to HTML.
function renderBlocks(md, keyPrefix) {
  if (!md.trim()) return [];
  const tokens = marked.lexer(md);
  const nodes = [];
  let buffer = [];
  let idx = 0;

  const flush = () => {
    if (buffer.length) {
      buffer.links = tokens.links;
      nodes.push(
        <div
          key={`${keyPrefix}-h${idx++}`}
          dangerouslySetInnerHTML={{ __html: marked.parser(buffer) }}
        />,
      );
      buffer = [];
    }
  };

  tokens.forEach((token) => {
    if (token.type === "code") {
      flush();
      const language = (token.lang || "text").split(/\s+/)[0];
      nodes.push(
        <CodeBlock key={`${keyPrefix}-c${idx++}`} language={language}>
          {token.text}
        </CodeBlock>,
      );
    } else {
      buffer.push(token);
    }
  });
  flush();
  return nodes;
}

// marked does not understand Docusaurus admonitions (:::warning ... :::), so
// render those blocks ourselves and render everything around them normally.
function renderMarkdown(md) {
  if (!md) return null;
  const admonition = /:::(\w+)[ \t]*([^\n]*)\n([\s\S]*?)\n:::/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let k = 0;
  while ((match = admonition.exec(md)) !== null) {
    nodes.push(...renderBlocks(md.slice(lastIndex, match.index), `seg${k}`));
    const [, type, title, body] = match;
    const heading = (title || type).trim();
    nodes.push(
      <div
        key={`adm${k}`}
        className={`${styles.admonition} ${styles[`admonition_${type}`] || ""}`}
      >
        <div className={styles.admonitionTitle}>{heading}</div>
        {renderBlocks(body, `adm${k}`)}
      </div>,
    );
    lastIndex = admonition.lastIndex;
    k++;
  }
  nodes.push(...renderBlocks(md.slice(lastIndex), `seg${k}`));
  return nodes;
}

function Markdown({ children }) {
  return <div className={styles.markdown}>{renderMarkdown(children)}</div>;
}

function RecommendedBadge() {
  return <span className={styles.recommendedBadge}>Recommended</span>;
}

/**
 * @param {{ models: Model[] }} props
 */
export default function ModelConfigDropdown({ models }) {
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const selectedModel = models[selectedModelIndex];
  const hasChoices = models.length > 1;

  const handleModelSelect = (index) => {
    setSelectedModelIndex(index);
    setIsOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.step}>
          <h4 className={styles.stepTitle}>Step 1 — Choose a model</h4>
          <div
            className={`${styles.dropdown} ${isOpen ? styles.open : ""} ${
              hasChoices ? "" : styles.static
            }`}
            onClick={hasChoices ? () => setIsOpen(!isOpen) : undefined}
          >
            <div className={styles.dropdownContent}>
              <span className={styles.modelName}>
                {selectedModel.label}
                {selectedModel.recommended && <RecommendedBadge />}
              </span>
              {hasChoices && (
                <span className={styles.arrow}>{isOpen ? "▲" : "▼"}</span>
              )}
            </div>
          </div>

          {isOpen && hasChoices && (
            <div className={styles.menu}>
              {models.map((model, index) => (
                <div
                  key={model.key}
                  className={`${styles.menuItem} ${
                    index === selectedModelIndex ? styles.menuItemActive : ""
                  }`}
                  onClick={() => handleModelSelect(index)}
                >
                  {model.label}
                  {model.recommended && <RecommendedBadge />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.step}>
          <h4 className={styles.stepTitle}>Step 2 — Download the model</h4>
          <Markdown>{selectedModel.download}</Markdown>
        </div>

        <div className={styles.step}>
          <h4 className={styles.stepTitle}>Step 3 — Configure the detector</h4>
          <ConfigTabs>
            <TabItem value="ui">
              <Markdown>{selectedModel.ui}</Markdown>
            </TabItem>
            <TabItem value="yaml">
              <CodeBlock language="yaml">{selectedModel.yaml}</CodeBlock>
            </TabItem>
          </ConfigTabs>
        </div>
      </div>
    </div>
  );
}
