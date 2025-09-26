/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import { createDescription } from "./createDescription";
import { create, guard } from "./utils";
import { OAuthFlowObject, SecuritySchemeObject } from "../openapi/types";

export function createAuthentication(securitySchemes: SecuritySchemeObject) {
  if (!securitySchemes || !Object.keys(securitySchemes).length) return "";

  const createAuthenticationTable = (securityScheme: any) => {
    const {
      bearerFormat,
      flows,
      name,
      scheme,
      type,
      openIdConnectUrl,
      in: paramIn,
    } = securityScheme;

    const createSecuritySchemeTypeRow = () =>
      create("tr", {
        children: [
          create("th", { children: "Security Scheme Type:" }),
          create("td", { children: type }),
        ],
      });

    const createOAuthFlowRows = () => {
      const flowRows = Object.entries(flows).map(([flowType, flowObj]) => {
        const { authorizationUrl, tokenUrl, refreshUrl, scopes } =
          flowObj as OAuthFlowObject;

        return create("tr", {
          children: [
            create("th", { children: `OAuth Flow (${flowType}):` }),
            create("td", {
              children: [
                guard(tokenUrl, () =>
                  create("div", { children: `Token URL: ${tokenUrl}` })
                ),
                guard(authorizationUrl, () =>
                  create("div", {
                    children: `Authorization URL: ${authorizationUrl}`,
                  })
                ),
                guard(refreshUrl, () =>
                  create("div", { children: `Refresh URL: ${refreshUrl}` })
                ),
                create("span", { children: "Scopes:" }),
                create("ul", {
                  children: Object.entries(scopes).map(([scope, description]) =>
                    create("li", { children: `${scope}: ${description}` })
                  ),
                }),
              ],
            }),
          ],
        });
      });

      return flowRows.join("");
    };

    switch (type) {
      case "apiKey":
        return create("div", {
          children: [
            create("table", {
              children: create("tbody", {
                children: [
                  createSecuritySchemeTypeRow(),
                  create("tr", {
                    children: [
                      create("th", {
                        children: `${paramIn.charAt(0).toUpperCase() + paramIn.slice(1)} parameter name:`,
                      }),
                      create("td", { children: name }),
                    ],
                  }),
                ],
              }),
            }),
          ],
        });
      case "http":
        return create("div", {
          children: [
            create("table", {
              children: create("tbody", {
                children: [
                  createSecuritySchemeTypeRow(),
                  create("tr", {
                    children: [
                      create("th", { children: "HTTP Authorization Scheme:" }),
                      create("td", { children: scheme }),
                    ],
                  }),
                  guard(bearerFormat, () =>
                    create("tr", {
                      children: [
                        create("th", { children: "Bearer format:" }),
                        create("td", { children: bearerFormat }),
                      ],
                    })
                  ),
                ],
              }),
            }),
          ],
        });
      case "oauth2":
        return create("div", {
          children: [
            create("table", {
              children: create("tbody", {
                children: [
                  createSecuritySchemeTypeRow(),
                  createOAuthFlowRows(),
                ],
              }),
            }),
          ],
        });
      case "openIdConnect":
        return create("div", {
          children: [
            create("table", {
              children: create("tbody", {
                children: [
                  createSecuritySchemeTypeRow(),
                  guard(openIdConnectUrl, () =>
                    create("tr", {
                      children: [
                        create("th", { children: "OpenID Connect URL:" }),
                        create("td", { children: openIdConnectUrl }),
                      ],
                    })
                  ),
                ],
              }),
            }),
          ],
        });
      default:
        return "";
    }
  };
  const formatTabLabel = (key: string, type: string, scheme: string) => {
    const formattedLabel = key
      .replace(/(_|-)/g, " ")
      .trim()
      .replace(/\w\S*/g, (str) => str.charAt(0).toUpperCase() + str.substr(1))
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
    const isOAuth = type === "oauth2";
    const isApiKey = type === "apiKey";
    const isHttpBasic = type === "http" && scheme === "basic";
    const isHttpBearer = type === "http" && scheme === "bearer";
    const isOpenId = type === "openIdConnect";

    if (isOAuth) return `OAuth 2.0: ${key}`;
    if (isApiKey) return `API Key: ${key}`;
    if (isHttpBasic) return "HTTP: Basic Auth";
    if (isHttpBearer) return "HTTP: Bearer Auth";
    if (isOpenId) return `OpenID Connect: ${key}`;

    return formattedLabel;
  };

  return create("div", {
    children: [
      create(
        "Heading",
        {
          children: "Authentication",
          id: "authentication",
          as: "h2",
          className: "openapi-tabs__heading",
        },
        { inline: true }
      ),
      create("SchemaTabs", {
        className: "openapi-tabs__security-schemes",
        children: Object.entries(securitySchemes).map(
          ([schemeKey, schemeObj]) =>
            create("TabItem", {
              label: formatTabLabel(
                schemeKey,
                schemeObj.type,
                schemeObj.scheme
              ),
              value: `${schemeKey}`,
              children: [
                createDescription(schemeObj.description),
                createAuthenticationTable(schemeObj),
              ],
            })
        ),
      }),
    ],
    style: { marginBottom: "2rem" },
  });
}
