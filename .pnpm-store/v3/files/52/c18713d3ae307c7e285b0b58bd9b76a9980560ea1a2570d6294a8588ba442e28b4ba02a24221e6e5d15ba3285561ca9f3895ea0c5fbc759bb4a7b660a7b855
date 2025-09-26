/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import json2xml from "@theme/ApiExplorer/Body/json2xml";
import FormFileUpload from "@theme/ApiExplorer/FormFileUpload";
import FormItem from "@theme/ApiExplorer/FormItem";
import FormSelect from "@theme/ApiExplorer/FormSelect";
import FormTextInput from "@theme/ApiExplorer/FormTextInput";
import LiveApp from "@theme/ApiExplorer/LiveEditor";
import { useTypedDispatch, useTypedSelector } from "@theme/ApiItem/hooks";
import Markdown from "@theme/Markdown";
import SchemaTabs from "@theme/SchemaTabs";
import TabItem from "@theme/TabItem";
import { RequestBodyObject } from "docusaurus-plugin-openapi-docs/src/openapi/types";
import format from "xml-formatter";

import {
  clearFormBodyKey,
  clearRawBody,
  setFileFormBody,
  setFileRawBody,
  setStringFormBody,
} from "./slice";

export interface Props {
  jsonRequestBodyExample: string;
  requestBodyMetadata?: RequestBodyObject;
  methods?: any;
  required?: boolean;
}

function BodyWrap({
  requestBodyMetadata,
  jsonRequestBodyExample,
  methods,
  required,
}: Props) {
  const contentType = useTypedSelector((state: any) => state.contentType.value);

  // NOTE: We used to check if body was required, but opted to always show the request body
  // to reduce confusion, see: https://github.com/cloud-annotations/docusaurus-openapi/issues/145

  // No body
  if (contentType === undefined) {
    return null;
  }

  return (
    <Body
      requestBodyMetadata={requestBodyMetadata}
      jsonRequestBodyExample={jsonRequestBodyExample}
      required={required}
    />
  );
}

function Body({
  requestBodyMetadata,
  jsonRequestBodyExample,
  methods,
  required,
}: Props) {
  const contentType = useTypedSelector((state: any) => state.contentType.value);
  const dispatch = useTypedDispatch();

  // Lot's of possible content-types:
  // - application/json
  // - application/xml
  // - text/plain
  // - text/css
  // - text/html
  // - text/javascript
  // - application/javascript
  // - multipart/form-data
  // - application/x-www-form-urlencoded
  // - image/svg+xml;charset=US-ASCII

  // Show editor:
  // - application/json
  // - application/xml
  // - */*

  // Show form:
  // - multipart/form-data
  // - application/x-www-form-urlencoded

  const schema = requestBodyMetadata?.content?.[contentType]?.schema;
  const example = requestBodyMetadata?.content?.[contentType]?.example;
  const examples = requestBodyMetadata?.content?.[contentType]?.examples;

  if (schema?.format === "binary") {
    return (
      <FormItem>
        <FormFileUpload
          placeholder={schema.description || "Body"}
          onChange={(file: any) => {
            if (file === undefined) {
              dispatch(clearRawBody());
              return;
            }
            dispatch(
              setFileRawBody({
                src: `/path/to/${file.name}`,
                content: file,
              })
            );
          }}
        />
      </FormItem>
    );
  }
  if (
    (contentType === "multipart/form-data" ||
      contentType === "application/x-www-form-urlencoded") &&
    schema?.type === "object"
  ) {
    return (
      <FormItem className="openapi-explorer__form-item-body-container">
        <div>
          {Object.entries(schema.properties ?? {}).map(([key, val]: any) => {
            if (val.format === "binary") {
              return (
                <FormItem
                  key={key}
                  label={key}
                  required={
                    Array.isArray(schema.required) &&
                    schema.required.includes(key)
                  }
                >
                  <FormFileUpload
                    placeholder={val.description || key}
                    onChange={(file: any) => {
                      if (file === undefined) {
                        dispatch(clearFormBodyKey(key));
                        return;
                      }
                      dispatch(
                        setFileFormBody({
                          key: key,
                          value: {
                            src: `/path/to/${file.name}`,
                            content: file,
                          },
                        })
                      );
                    }}
                  />
                </FormItem>
              );
            }

            if (val.enum) {
              return (
                <FormItem
                  key={key}
                  label={key}
                  required={
                    Array.isArray(schema.required) &&
                    schema.required.includes(key)
                  }
                >
                  <FormSelect
                    options={["---", ...val.enum]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value;
                      if (val === "---") {
                        dispatch(clearFormBodyKey(key));
                      } else {
                        dispatch(
                          setStringFormBody({
                            key: key,
                            value: val,
                          })
                        );
                      }
                    }}
                  />
                </FormItem>
              );
            }
            // TODO: support all the other types.
            return (
              <FormItem
                key={key}
                label={key}
                required={
                  Array.isArray(schema.required) &&
                  schema.required.includes(key)
                }
              >
                <FormTextInput
                  paramName={key}
                  isRequired={
                    Array.isArray(schema.required) &&
                    schema.required.includes(key)
                  }
                  placeholder={val.description || key}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    dispatch(
                      setStringFormBody({ key: key, value: e.target.value })
                    );
                  }}
                />
              </FormItem>
            );
          })}
        </div>
      </FormItem>
    );
  }

  let language = "plaintext";
  let defaultBody = ""; //"body content";
  let exampleBody;
  let examplesBodies = [] as any;

  if (
    contentType.includes("application/json") ||
    contentType.endsWith("+json")
  ) {
    if (jsonRequestBodyExample) {
      defaultBody = JSON.stringify(jsonRequestBodyExample, null, 2);
    }
    if (example) {
      exampleBody = JSON.stringify(example, null, 2);
    }
    if (examples) {
      for (const [key, example] of Object.entries(examples)) {
        let body = example.value;
        try {
          // If the value is already valid JSON we shouldn't double encode the value
          JSON.parse(example.value);
        } catch (e) {
          body = JSON.stringify(example.value, null, 2);
        }

        examplesBodies.push({
          label: key,
          body,
          summary: example.summary,
        });
      }
    }
    language = "json";
  }

  if (contentType === "application/xml" || contentType.endsWith("+xml")) {
    if (jsonRequestBodyExample) {
      try {
        defaultBody = format(json2xml(jsonRequestBodyExample, ""), {
          indentation: "  ",
          lineSeparator: "\n",
          collapseContent: true,
        });
      } catch {
        defaultBody = json2xml(jsonRequestBodyExample);
      }
    }
    if (example) {
      try {
        exampleBody = format(json2xml(example, ""), {
          indentation: "  ",
          lineSeparator: "\n",
          collapseContent: true,
        });
      } catch {
        exampleBody = json2xml(example);
      }
    }
    if (examples) {
      for (const [key, example] of Object.entries(examples)) {
        let formattedXmlBody;
        try {
          formattedXmlBody = format(example.value, {
            indentation: "  ",
            lineSeparator: "\n",
            collapseContent: true,
          });
        } catch {
          formattedXmlBody = example.value;
        }
        examplesBodies.push({
          label: key,
          body: formattedXmlBody,
          summary: example.summary,
        });
      }
    }
    language = "xml";
  }

  if (exampleBody) {
    return (
      <FormItem>
        <SchemaTabs className="openapi-tabs__schema" lazy>
          {/* @ts-ignore */}
          <TabItem
            label="Example (from schema)"
            value="Example (from schema)"
            default
          >
            <LiveApp action={dispatch} language={language} required={required}>
              {defaultBody}
            </LiveApp>
          </TabItem>
          {/* @ts-ignore */}
          <TabItem label="Example" value="example">
            {example.summary && <Markdown>{example.summary}</Markdown>}
            {exampleBody && (
              <LiveApp
                action={dispatch}
                language={language}
                required={required}
              >
                {exampleBody}
              </LiveApp>
            )}
          </TabItem>
        </SchemaTabs>
      </FormItem>
    );
  }

  if (examplesBodies && examplesBodies.length > 0) {
    return (
      <FormItem className="openapi-explorer__form-item-body-container">
        <SchemaTabs className="openapi-tabs__schema" lazy>
          {/* @ts-ignore */}
          <TabItem
            label="Example (from schema)"
            value="Example (from schema)"
            default
          >
            <LiveApp action={dispatch} language={language} required={required}>
              {defaultBody}
            </LiveApp>
          </TabItem>
          {examplesBodies.map((example: any) => {
            return (
              // @ts-ignore
              <TabItem
                label={example.label}
                value={example.label}
                key={example.label}
              >
                {example.summary && <Markdown>{example.summary}</Markdown>}
                {example.body && (
                  <LiveApp action={dispatch} language={language}>
                    {example.body}
                  </LiveApp>
                )}
              </TabItem>
            );
          })}
        </SchemaTabs>
      </FormItem>
    );
  }

  return (
    <FormItem>
      <LiveApp action={dispatch} language={language} required={required}>
        {defaultBody}
      </LiveApp>
    </FormItem>
  );
}

export default BodyWrap;
