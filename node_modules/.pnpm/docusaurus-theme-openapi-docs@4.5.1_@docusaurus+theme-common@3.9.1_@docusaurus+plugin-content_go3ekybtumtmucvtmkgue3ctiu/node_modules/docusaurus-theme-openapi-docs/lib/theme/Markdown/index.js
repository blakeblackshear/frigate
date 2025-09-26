/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import Admonition from "@theme/Admonition";
import CodeBlock from "@theme/CodeBlock";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

function remarkAdmonition() {
  return (tree) => {
    const openingTagRegex = /^:::(\w+)(?:\[(.*?)\])?\s*$/;
    const closingTagRegex = /^:::\s*$/;
    const textOnlyAdmonition = /^:::(\w+)(?:\[(.*?)\])?\s*([\s\S]*?)\s*:::$/;

    const nodes = [];
    let bufferedChildren = [];

    let insideAdmonition = false;
    let type = null;
    let title = null;

    tree.children.forEach((node) => {
      if (
        node.type === "paragraph" &&
        node.children.length === 1 &&
        node.children[0].type === "text"
      ) {
        const text = node.children[0].value.trim();
        const openingMatch = text.match(openingTagRegex);
        const closingMatch = text.match(closingTagRegex);
        const textOnlyAdmonitionMatch = text.match(textOnlyAdmonition);

        if (textOnlyAdmonitionMatch) {
          const type = textOnlyAdmonitionMatch[1];
          const title = textOnlyAdmonitionMatch[2]
            ? textOnlyAdmonitionMatch[2]?.trim()
            : undefined;
          const content = textOnlyAdmonitionMatch[3];

          const admonitionNode = {
            type: "admonition",
            data: {
              hName: "Admonition", // Tells ReactMarkdown to replace the node with Admonition component
              hProperties: {
                type, // Passed as a prop to the Admonition component
                title,
              },
            },
            children: [
              {
                type: "text",
                value: content?.trim(), // Trim leading/trailing whitespace
              },
            ],
          };
          nodes.push(admonitionNode);
          return;
        }

        if (openingMatch) {
          type = openingMatch[1];
          title = openingMatch[2] || type;
          insideAdmonition = true;
          return;
        }

        if (closingMatch && insideAdmonition) {
          nodes.push({
            type: "admonition",
            data: {
              hName: "Admonition",
              hProperties: { type: type, title: title },
            },
            children: bufferedChildren,
          });
          bufferedChildren = [];
          insideAdmonition = false;
          type = null;
          title = null;
          return;
        }
      }

      if (insideAdmonition) {
        bufferedChildren.push(node);
      } else {
        nodes.push(node);
      }
    });

    if (bufferedChildren.length > 0 && type) {
      nodes.push({
        type: "admonition",
        data: {
          hName: "Admonition",
          hProperties: { type: type, title: title },
        },
        children: bufferedChildren,
      });
    }
    tree.children = nodes;
  };
}

function convertAstToHtmlStr(ast) {
  if (!ast || !Array.isArray(ast)) {
    return "";
  }

  const convertNode = (node) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "element":
        const { tagName, properties, children } = node;

        // Convert attributes to a string
        const attrs = properties
          ? Object.entries(properties)
              .map(([key, value]) => `${key}="${value}"`)
              .join(" ")
          : "";

        // Convert children to HTML
        const childrenHtml = children ? children.map(convertNode).join("") : "";

        return `<${tagName} ${attrs}>${childrenHtml}</${tagName}>`;
      default:
        return "";
    }
  };

  return ast.map(convertNode).join("");
}

function Markdown({ children }) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw]}
      remarkPlugins={[remarkGfm, remarkAdmonition]}
      components={{
        pre: (props) => <div {...props} />,
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <CodeBlock className={className} language={match[1]} {...props}>
              {children}
            </CodeBlock>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        admonition: ({ node, ...props }) => {
          const type = node.data?.hProperties?.type || "note";
          const title = node.data?.hProperties?.title || type;
          const content = convertAstToHtmlStr(node.children);
          return (
            <Admonition type={type} title={title} {...props}>
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </Admonition>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export default Markdown;
