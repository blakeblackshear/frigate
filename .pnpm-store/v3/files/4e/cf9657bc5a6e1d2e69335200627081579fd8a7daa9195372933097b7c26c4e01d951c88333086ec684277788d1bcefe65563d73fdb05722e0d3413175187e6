/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React from "react";

import Link from "@docusaurus/Link";
import { useTypedSelector } from "@theme/ApiItem/hooks";

function SecuritySchemes(props: any) {
  const options = useTypedSelector((state: any) => state.auth.options);
  const selected = useTypedSelector((state: any) => state.auth.selected);
  const infoAuthPath = `/${props.infoPath}#authentication`;

  if (selected === undefined) return null;

  if (options[selected]?.[0]?.type === undefined) {
    return null;
  }

  const selectedAuth = options[selected];
  return (
    <details className="openapi-security__details" open={false}>
      <summary className="openapi-security__summary-container">
        <h4 className="openapi-security__summary-header">
          Authorization: {selectedAuth[0].name ?? selectedAuth[0].type}
        </h4>
      </summary>
      {selectedAuth.map((auth: any) => {
        const isHttp = auth.type === "http";
        const isApiKey = auth.type === "apiKey";
        const isOauth2 = auth.type === "oauth2";
        const isOpenId = auth.type === "openIdConnect";

        if (isHttp) {
          if (auth.scheme === "bearer") {
            const { name, key, type, scopes, ...rest } = auth;
            return (
              <React.Fragment key={auth.key}>
                <pre
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--openapi-card-background-color)",
                  }}
                >
                  <span>
                    <strong>name:</strong>{" "}
                    <Link to={infoAuthPath}>{name ?? key}</Link>
                  </span>
                  <span>
                    <strong>type: </strong>
                    {type}
                  </span>
                  {scopes && scopes.length > 0 && (
                    <span>
                      <strong>scopes: </strong>
                      <code>
                        {auth.scopes.length > 0 ? auth.scopes.toString() : "[]"}
                      </code>
                    </span>
                  )}
                  {Object.keys(rest).map((k, i) => {
                    return (
                      <span key={k}>
                        <strong>{k}: </strong>
                        {typeof rest[k] === "object"
                          ? JSON.stringify(rest[k], null, 2)
                          : String(rest[k])}
                      </span>
                    );
                  })}
                </pre>
              </React.Fragment>
            );
          }
          if (auth.scheme === "basic") {
            const { name, key, type, scopes, ...rest } = auth;
            return (
              <React.Fragment key={auth.key}>
                <pre
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--openapi-card-background-color)",
                  }}
                >
                  <span>
                    <strong>name:</strong>{" "}
                    <Link to={infoAuthPath}>{name ?? key}</Link>
                  </span>
                  <span>
                    <strong>type: </strong>
                    {type}
                  </span>
                  {scopes && scopes.length > 0 && (
                    <span>
                      <strong>scopes: </strong>
                      <code>
                        {auth.scopes.length > 0 ? auth.scopes.toString() : "[]"}
                      </code>
                    </span>
                  )}
                  {Object.keys(rest).map((k, i) => {
                    return (
                      <span key={k}>
                        <strong>{k}: </strong>
                        {typeof rest[k] === "object"
                          ? JSON.stringify(rest[k], null, 2)
                          : String(rest[k])}
                      </span>
                    );
                  })}
                </pre>
              </React.Fragment>
            );
          }
          return (
            <React.Fragment key={auth.key}>
              <pre
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--openapi-card-background-color)",
                }}
              >
                <span>
                  <strong>name:</strong>{" "}
                  <Link to={infoAuthPath}>{auth.name ?? auth.key}</Link>
                </span>
                <span>
                  <strong>type: </strong>
                  {auth.type}
                </span>
                <span>
                  <strong>in: </strong>
                  {auth.in}
                </span>
              </pre>
            </React.Fragment>
          );
        }

        if (isApiKey) {
          const { name, key, type, scopes, ...rest } = auth;
          return (
            <React.Fragment key={auth.key}>
              <pre
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--openapi-card-background-color)",
                }}
              >
                <span>
                  <strong>name:</strong>{" "}
                  <Link to={infoAuthPath}>{name ?? key}</Link>
                </span>
                <span>
                  <strong>type: </strong>
                  {type}
                </span>
                {scopes && scopes.length > 0 && (
                  <span>
                    <strong>scopes: </strong>
                    <code>
                      {auth.scopes.length > 0 ? auth.scopes.toString() : "[]"}
                    </code>
                  </span>
                )}
                {Object.keys(rest).map((k, i) => {
                  return (
                    <span key={k}>
                      <strong>{k}: </strong>
                      {typeof rest[k] === "object"
                        ? JSON.stringify(rest[k], null, 2)
                        : String(rest[k])}
                    </span>
                  );
                })}
              </pre>
            </React.Fragment>
          );
        }

        if (isOauth2) {
          const { name, key, type, scopes, flows, ...rest } = auth;
          return (
            <React.Fragment key={selected}>
              <pre
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--openapi-card-background-color)",
                }}
              >
                <span>
                  <strong>name:</strong>{" "}
                  <Link to={infoAuthPath}>{name ?? key}</Link>
                </span>
                <span>
                  <strong>type: </strong>
                  {type}
                </span>
                {scopes && scopes.length > 0 && (
                  <span>
                    <strong>scopes: </strong>
                    <code>
                      {auth.scopes.length > 0 ? auth.scopes.toString() : "[]"}
                    </code>
                  </span>
                )}
                {Object.keys(rest).map((k, i) => {
                  return (
                    <span key={k}>
                      <strong>{k}: </strong>
                      {typeof rest[k] === "object"
                        ? JSON.stringify(rest[k], null, 2)
                        : String(rest[k])}
                    </span>
                  );
                })}
                {flows && (
                  <span>
                    <code>
                      <strong>flows: </strong>
                      {JSON.stringify(flows, null, 2)}
                    </code>
                  </span>
                )}
              </pre>
            </React.Fragment>
          );
        }

        if (isOpenId) {
          const { name, key, scopes, type, ...rest } = auth;
          return (
            <React.Fragment key={auth.key}>
              <pre
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--openapi-card-background-color)",
                }}
              >
                <span>
                  <strong>name:</strong>{" "}
                  <Link to={infoAuthPath}>{name ?? key}</Link>
                </span>
                <span>
                  <strong>type: </strong>
                  {type}
                </span>
                {scopes && scopes.length > 0 && (
                  <span>
                    <strong>scopes: </strong>
                    <code>
                      {auth.scopes.length > 0 ? auth.scopes.toString() : "[]"}
                    </code>
                  </span>
                )}
                {Object.keys(rest).map((k, i) => {
                  return (
                    <span key={k}>
                      <strong>{k}: </strong>
                      {typeof rest[k] === "object"
                        ? JSON.stringify(rest[k], null, 2)
                        : String(rest[k])}
                    </span>
                  );
                })}
              </pre>
            </React.Fragment>
          );
        }

        return undefined;
      })}
    </details>
  );
}

export default SecuritySchemes;
