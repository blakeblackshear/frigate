/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import BrowserOnly from "@docusaurus/BrowserOnly";
import { useTypedSelector } from "@theme/ApiItem/hooks";

function colorForMethod(method: string) {
  switch (method.toLowerCase()) {
    case "get":
      return "primary";
    case "post":
      return "success";
    case "delete":
      return "danger";
    case "put":
      return "info";
    case "patch":
      return "warning";
    case "head":
      return "secondary";
    case "event":
      return "secondary";
    default:
      return undefined;
  }
}

export interface Props {
  method: string;
  path: string;
  context?: "endpoint" | "callback";
}

function MethodEndpoint({ method, path, context }: Props) {
  let serverValue = useTypedSelector((state: any) => state.server.value);
  let serverUrlWithVariables = "";

  const renderServerUrl = () => {
    if (context === "callback") {
      return "";
    }

    if (serverValue && serverValue.variables) {
      serverUrlWithVariables = serverValue.url.replace(/\/$/, "");

      Object.keys(serverValue.variables).forEach((variable) => {
        serverUrlWithVariables = serverUrlWithVariables.replace(
          `{${variable}}`,
          serverValue.variables?.[variable].default ?? ""
        );
      });
    }

    return (
      <BrowserOnly>
        {() => {
          if (serverUrlWithVariables.length) {
            return serverUrlWithVariables;
          } else if (serverValue && serverValue.url) {
            return serverValue.url;
          }
        }}
      </BrowserOnly>
    );
  };

  return (
    <>
      <pre className="openapi__method-endpoint">
        <span className={"badge badge--" + colorForMethod(method)}>
          {method === "event" ? "Webhook" : method.toUpperCase()}
        </span>{" "}
        {method !== "event" && (
          <h2 className="openapi__method-endpoint-path">
            {renderServerUrl()}
            {`${path.replace(/{([a-z0-9-_]+)}/gi, ":$1")}`}
          </h2>
        )}
      </pre>
      <div className="openapi__divider" />
    </>
  );
}

export default MethodEndpoint;
