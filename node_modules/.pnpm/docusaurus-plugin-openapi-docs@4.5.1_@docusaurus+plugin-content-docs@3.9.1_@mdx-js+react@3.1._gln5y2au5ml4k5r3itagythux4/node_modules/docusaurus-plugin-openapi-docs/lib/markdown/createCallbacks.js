"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCallbacks = createCallbacks;
const createCallbackMethodEndpoint_1 = require("./createCallbackMethodEndpoint");
const createDescription_1 = require("./createDescription");
const createRequestBodyDetails_1 = require("./createRequestBodyDetails");
const createStatusCodes_1 = require("./createStatusCodes");
const utils_1 = require("./utils");
function createCallbacks({ callbacks }) {
    if (callbacks === undefined) {
        return undefined;
    }
    const callbacksNames = Object.keys(callbacks);
    if (callbacksNames.length === 0) {
        return undefined;
    }
    return (0, utils_1.create)("div", {
        children: [
            (0, utils_1.create)("div", {
                className: "openapi__divider",
            }),
            (0, utils_1.create)("Heading", {
                children: "Callbacks",
                id: "callbacks",
                as: "h2",
                className: "openapi-tabs__heading",
            }, { inline: true }),
            (0, utils_1.create)("OperationTabs", {
                className: "openapi-tabs__operation",
                children: callbacksNames.flatMap((name) => {
                    const path = Object.keys(callbacks[name])[0];
                    const methods = new Map([
                        ["delete", callbacks[name][path].delete],
                        ["get", callbacks[name][path].get],
                        ["head", callbacks[name][path].head],
                        ["options", callbacks[name][path].options],
                        ["patch", callbacks[name][path].patch],
                        ["post", callbacks[name][path].post],
                        ["put", callbacks[name][path].put],
                        ["trace", callbacks[name][path].trace],
                    ]);
                    return Array.from(methods).flatMap(([method, operationObject]) => {
                        if (!operationObject)
                            return [];
                        const { description, requestBody, responses } = operationObject;
                        return [
                            (0, utils_1.create)("TabItem", {
                                label: `${method.toUpperCase()} ${name}`,
                                value: `${method}-${name}`,
                                children: [
                                    (0, createCallbackMethodEndpoint_1.createCallbackMethodEndpoint)(method, path),
                                    // TODO: add `deprecation notice` when markdown support is added
                                    (0, createDescription_1.createDescription)(description),
                                    (0, createRequestBodyDetails_1.createRequestBodyDetails)({
                                        title: "Body",
                                        body: requestBody,
                                    }),
                                    (0, createStatusCodes_1.createStatusCodes)({
                                        id: "callbacks-responses",
                                        label: "Callbacks Responses",
                                        responses,
                                    }),
                                ],
                            }),
                        ];
                    });
                }),
            }),
        ],
    });
}
