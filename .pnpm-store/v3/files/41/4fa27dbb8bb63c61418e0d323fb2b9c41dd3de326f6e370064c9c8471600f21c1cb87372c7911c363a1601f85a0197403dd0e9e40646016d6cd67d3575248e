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
import {
  ExampleFromSchema,
  ResponseExample,
  ResponseExamples,
} from "@theme/ResponseExamples";
import SchemaNode from "@theme/Schema";
import SchemaTabs from "@theme/SchemaTabs";
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

const ResponseSchemaComponent: React.FC<Props> = ({
  title,
  body,
  style,
}): any => {
  if (
    body === undefined ||
    body.content === undefined ||
    Object.keys(body).length === 0 ||
    Object.keys(body.content).length === 0
  ) {
    return null;
  }

  // Get all MIME types, including vendor-specific
  const mimeTypes = Object.keys(body.content);
  if (mimeTypes && mimeTypes.length) {
    return (
      <MimeTabs className="openapi-tabs__mime" schemaType="response">
        {mimeTypes.map((mimeType: any) => {
          const responseExamples = body.content![mimeType].examples;
          const responseExample = body.content![mimeType].example;
          const firstBody: any =
            body.content![mimeType].schema ?? body.content![mimeType];

          if (
            firstBody === undefined &&
            responseExample === undefined &&
            responseExamples === undefined
          ) {
            return undefined;
          }

          if (firstBody) {
            return (
              // @ts-ignore
              <TabItem key={mimeType} label={mimeType} value={mimeType}>
                <SchemaTabs className="openapi-tabs__schema">
                  {/* @ts-ignore */}
                  <TabItem key={title} label={title} value={title}>
                    <Details
                      className="openapi-markdown__details response"
                      data-collapsed={false}
                      open={true}
                      style={style}
                      summary={
                        <>
                          <summary>
                            <strong className="openapi-markdown__details-summary-response">
                              {title}
                              {body.required === true && (
                                <span className="openapi-schema__required">
                                  required
                                </span>
                              )}
                            </strong>
                          </summary>
                        </>
                      }
                    >
                      <div style={{ textAlign: "left", marginLeft: "1rem" }}>
                        {body.description && (
                          <div
                            style={{ marginTop: "1rem", marginBottom: "1rem" }}
                          >
                            <Markdown>{body.description}</Markdown>
                          </div>
                        )}
                      </div>
                      <ul style={{ marginLeft: "1rem" }}>
                        <SchemaNode schema={firstBody} schemaType="response" />
                      </ul>
                    </Details>
                  </TabItem>
                  {firstBody &&
                    ExampleFromSchema({
                      schema: firstBody,
                      mimeType: mimeType,
                    })}

                  {responseExamples &&
                    ResponseExamples({ responseExamples, mimeType })}

                  {responseExample &&
                    ResponseExample({ responseExample, mimeType })}
                </SchemaTabs>
              </TabItem>
            );
          }
          return undefined;
        })}
      </MimeTabs>
    );
  }
  return undefined;
};

const ResponseSchema: React.FC<Props> = (props) => {
  return (
    <BrowserOnly fallback={<SkeletonLoader size="md" />}>
      {() => {
        return <ResponseSchemaComponent {...props} />;
      }}
    </BrowserOnly>
  );
};

export default ResponseSchema;
