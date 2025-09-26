"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthentication = createAuthentication;
const createDescription_1 = require("./createDescription");
const utils_1 = require("./utils");
function createAuthentication(securitySchemes) {
    if (!securitySchemes || !Object.keys(securitySchemes).length)
        return "";
    const createAuthenticationTable = (securityScheme) => {
        const { bearerFormat, flows, name, scheme, type, openIdConnectUrl, in: paramIn, } = securityScheme;
        const createSecuritySchemeTypeRow = () => (0, utils_1.create)("tr", {
            children: [
                (0, utils_1.create)("th", { children: "Security Scheme Type:" }),
                (0, utils_1.create)("td", { children: type }),
            ],
        });
        const createOAuthFlowRows = () => {
            const flowRows = Object.entries(flows).map(([flowType, flowObj]) => {
                const { authorizationUrl, tokenUrl, refreshUrl, scopes } = flowObj;
                return (0, utils_1.create)("tr", {
                    children: [
                        (0, utils_1.create)("th", { children: `OAuth Flow (${flowType}):` }),
                        (0, utils_1.create)("td", {
                            children: [
                                (0, utils_1.guard)(tokenUrl, () => (0, utils_1.create)("div", { children: `Token URL: ${tokenUrl}` })),
                                (0, utils_1.guard)(authorizationUrl, () => (0, utils_1.create)("div", {
                                    children: `Authorization URL: ${authorizationUrl}`,
                                })),
                                (0, utils_1.guard)(refreshUrl, () => (0, utils_1.create)("div", { children: `Refresh URL: ${refreshUrl}` })),
                                (0, utils_1.create)("span", { children: "Scopes:" }),
                                (0, utils_1.create)("ul", {
                                    children: Object.entries(scopes).map(([scope, description]) => (0, utils_1.create)("li", { children: `${scope}: ${description}` })),
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
                return (0, utils_1.create)("div", {
                    children: [
                        (0, utils_1.create)("table", {
                            children: (0, utils_1.create)("tbody", {
                                children: [
                                    createSecuritySchemeTypeRow(),
                                    (0, utils_1.create)("tr", {
                                        children: [
                                            (0, utils_1.create)("th", {
                                                children: `${paramIn.charAt(0).toUpperCase() + paramIn.slice(1)} parameter name:`,
                                            }),
                                            (0, utils_1.create)("td", { children: name }),
                                        ],
                                    }),
                                ],
                            }),
                        }),
                    ],
                });
            case "http":
                return (0, utils_1.create)("div", {
                    children: [
                        (0, utils_1.create)("table", {
                            children: (0, utils_1.create)("tbody", {
                                children: [
                                    createSecuritySchemeTypeRow(),
                                    (0, utils_1.create)("tr", {
                                        children: [
                                            (0, utils_1.create)("th", { children: "HTTP Authorization Scheme:" }),
                                            (0, utils_1.create)("td", { children: scheme }),
                                        ],
                                    }),
                                    (0, utils_1.guard)(bearerFormat, () => (0, utils_1.create)("tr", {
                                        children: [
                                            (0, utils_1.create)("th", { children: "Bearer format:" }),
                                            (0, utils_1.create)("td", { children: bearerFormat }),
                                        ],
                                    })),
                                ],
                            }),
                        }),
                    ],
                });
            case "oauth2":
                return (0, utils_1.create)("div", {
                    children: [
                        (0, utils_1.create)("table", {
                            children: (0, utils_1.create)("tbody", {
                                children: [
                                    createSecuritySchemeTypeRow(),
                                    createOAuthFlowRows(),
                                ],
                            }),
                        }),
                    ],
                });
            case "openIdConnect":
                return (0, utils_1.create)("div", {
                    children: [
                        (0, utils_1.create)("table", {
                            children: (0, utils_1.create)("tbody", {
                                children: [
                                    createSecuritySchemeTypeRow(),
                                    (0, utils_1.guard)(openIdConnectUrl, () => (0, utils_1.create)("tr", {
                                        children: [
                                            (0, utils_1.create)("th", { children: "OpenID Connect URL:" }),
                                            (0, utils_1.create)("td", { children: openIdConnectUrl }),
                                        ],
                                    })),
                                ],
                            }),
                        }),
                    ],
                });
            default:
                return "";
        }
    };
    const formatTabLabel = (key, type, scheme) => {
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
        if (isOAuth)
            return `OAuth 2.0: ${key}`;
        if (isApiKey)
            return `API Key: ${key}`;
        if (isHttpBasic)
            return "HTTP: Basic Auth";
        if (isHttpBearer)
            return "HTTP: Bearer Auth";
        if (isOpenId)
            return `OpenID Connect: ${key}`;
        return formattedLabel;
    };
    return (0, utils_1.create)("div", {
        children: [
            (0, utils_1.create)("Heading", {
                children: "Authentication",
                id: "authentication",
                as: "h2",
                className: "openapi-tabs__heading",
            }, { inline: true }),
            (0, utils_1.create)("SchemaTabs", {
                className: "openapi-tabs__security-schemes",
                children: Object.entries(securitySchemes).map(([schemeKey, schemeObj]) => (0, utils_1.create)("TabItem", {
                    label: formatTabLabel(schemeKey, schemeObj.type, schemeObj.scheme),
                    value: `${schemeKey}`,
                    children: [
                        (0, createDescription_1.createDescription)(schemeObj.description),
                        createAuthenticationTable(schemeObj),
                    ],
                })),
            }),
        ],
        style: { marginBottom: "2rem" },
    });
}
