/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import CodeSnippets from "@theme/ApiExplorer/CodeSnippets";
import Request from "@theme/ApiExplorer/Request";
import Response from "@theme/ApiExplorer/Response";
import SecuritySchemes from "@theme/ApiExplorer/SecuritySchemes";
import { ApiItem } from "docusaurus-plugin-openapi-docs/src/types";
import * as sdk from "postman-collection";

function ApiExplorer({
  item,
  infoPath,
}: {
  item: NonNullable<ApiItem>;
  infoPath: string;
}) {
  const postman = new sdk.Request(
    item.postman
      ? sdk.Request.isRequest(item.postman)
        ? (item.postman as any).toJSON()
        : (item.postman as any)
      : {}
  );

  return (
    <>
      <SecuritySchemes infoPath={infoPath} />
      {item.method !== "event" && (
        <CodeSnippets
          postman={postman}
          codeSamples={(item as any)["x-codeSamples"] ?? []}
        />
      )}
      <Request item={item} />
      <Response item={item} />
    </>
  );
}

export default ApiExplorer;
