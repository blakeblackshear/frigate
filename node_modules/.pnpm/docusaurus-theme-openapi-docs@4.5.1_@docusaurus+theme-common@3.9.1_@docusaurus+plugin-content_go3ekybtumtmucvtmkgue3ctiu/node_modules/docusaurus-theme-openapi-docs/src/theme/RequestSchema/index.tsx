/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import BrowserOnly from "@docusaurus/BrowserOnly";
import Details from "@theme/Details";
import Markdown from "@theme/Markdown";
import MimeTabs from "@theme/MimeTabs"; // Assume these components exist
import SchemaNode from "@theme/Schema";
import SkeletonLoader from "@theme/SkeletonLoader";
import TabItem from "@theme/TabItem";
import { MediaTypeObject } from "docusaurus-plugin-openapi-docs/lib/openapi/types";

interface Props {
  style?: React.CSSProperties;
  title: string;
  body: {
    content?: {
      [key: string]: MediaTypeObject;
    };
    description?: string;
    required?: string[] | boolean;
  };
}

const RequestSchemaComponent: React.FC<Props> = ({ title, body, style }) => {
  if (
    body === undefined ||
    body.content === undefined ||
    Object.keys(body).length === 0 ||
    Object.keys(body.content).length === 0
  ) {
    return null;
  }

  const mimeTypes = Object.keys(body.content);

  if (mimeTypes.length > 1) {
    return (
      <MimeTabs className="openapi-tabs__mime" schemaType="request">
        {mimeTypes.map((mimeType) => {
          const firstBody = body.content![mimeType].schema;
          if (
            firstBody === undefined ||
            (firstBody.properties &&
              Object.keys(firstBody.properties).length === 0)
          ) {
            return null;
          }
          return (
            // @ts-ignore
            <TabItem key={mimeType} label={mimeType} value={mimeType}>
              <Details
                className="openapi-markdown__details mime"
                data-collapsed={false}
                open={true}
                style={style}
                summary={
                  <>
                    <summary>
                      <h3 className="openapi-markdown__details-summary-header-body">
                        {title}
                        {body.required === true && (
                          <span className="openapi-schema__required">
                            required
                          </span>
                        )}
                      </h3>
                    </summary>
                  </>
                }
              >
                <div style={{ textAlign: "left", marginLeft: "1rem" }}>
                  {body.description && (
                    <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                      <Markdown>{body.description}</Markdown>
                    </div>
                  )}
                </div>
                <ul style={{ marginLeft: "1rem" }}>
                  <SchemaNode schema={firstBody} schemaType="request" />
                </ul>
              </Details>
            </TabItem>
          );
        })}
      </MimeTabs>
    );
  }

  const randomFirstKey = mimeTypes[0];
  const firstBody =
    body.content[randomFirstKey].schema ?? body.content![randomFirstKey];

  if (firstBody === undefined) {
    return null;
  }

  return (
    <MimeTabs className="openapi-tabs__mime" schemaType="request">
      {/* @ts-ignore */}
      <TabItem label={randomFirstKey} value={`${randomFirstKey}-schema`}>
        <Details
          className="openapi-markdown__details mime"
          data-collapsed={false}
          open={true}
          style={style}
          summary={
            <>
              <summary>
                <h3 className="openapi-markdown__details-summary-header-body">
                  {title}
                  {firstBody.type === "array" && (
                    <span style={{ opacity: "0.6" }}> array</span>
                  )}
                  {body.required && (
                    <strong className="openapi-schema__required">
                      required
                    </strong>
                  )}
                </h3>
              </summary>
            </>
          }
        >
          <div style={{ textAlign: "left", marginLeft: "1rem" }}>
            {body.description && (
              <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                <Markdown>{body.description}</Markdown>
              </div>
            )}
          </div>
          <ul style={{ marginLeft: "1rem" }}>
            <SchemaNode schema={firstBody} schemaType="request" />
          </ul>
        </Details>
      </TabItem>
    </MimeTabs>
  );
};

const RequestSchema: React.FC<Props> = (props) => {
  return (
    <BrowserOnly fallback={<SkeletonLoader size="sm" />}>
      {() => {
        return <RequestSchemaComponent {...props} />;
      }}
    </BrowserOnly>
  );
};

export default RequestSchema;
