"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiPageMD = createApiPageMD;
exports.createInfoPageMD = createInfoPageMD;
exports.createTagPageMD = createTagPageMD;
exports.createSchemaPageMD = createSchemaPageMD;
const createAuthentication_1 = require("./createAuthentication");
const createAuthorization_1 = require("./createAuthorization");
const createCallbacks_1 = require("./createCallbacks");
const createContactInfo_1 = require("./createContactInfo");
const createDeprecationNotice_1 = require("./createDeprecationNotice");
const createDescription_1 = require("./createDescription");
const createDownload_1 = require("./createDownload");
const createHeading_1 = require("./createHeading");
const createLicense_1 = require("./createLicense");
const createLogo_1 = require("./createLogo");
const createMethodEndpoint_1 = require("./createMethodEndpoint");
const createParamsDetails_1 = require("./createParamsDetails");
const createRequestBodyDetails_1 = require("./createRequestBodyDetails");
const createRequestHeader_1 = require("./createRequestHeader");
const createStatusCodes_1 = require("./createStatusCodes");
const createTermsOfService_1 = require("./createTermsOfService");
const createVendorExtensions_1 = require("./createVendorExtensions");
const createVersionBadge_1 = require("./createVersionBadge");
const utils_1 = require("./utils");
function createApiPageMD({ title, api: { deprecated, "x-deprecated-description": deprecatedDescription, description, method, path, extensions, parameters, requestBody, responses, callbacks, }, infoPath, frontMatter, }) {
    return (0, utils_1.render)([
        `import MethodEndpoint from "@theme/ApiExplorer/MethodEndpoint";\n`,
        `import ParamsDetails from "@theme/ParamsDetails";\n`,
        `import RequestSchema from "@theme/RequestSchema";\n`,
        `import StatusCodes from "@theme/StatusCodes";\n`,
        `import OperationTabs from "@theme/OperationTabs";\n`,
        `import TabItem from "@theme/TabItem";\n`,
        `import Heading from "@theme/Heading";\n\n`,
        (0, createHeading_1.createHeading)(title),
        (0, createMethodEndpoint_1.createMethodEndpoint)(method, path),
        infoPath && (0, createAuthorization_1.createAuthorization)(infoPath),
        frontMatter.show_extensions
            ? (0, createVendorExtensions_1.createVendorExtensions)(extensions)
            : undefined,
        (0, createDeprecationNotice_1.createDeprecationNotice)({ deprecated, description: deprecatedDescription }),
        (0, createDescription_1.createDescription)(description),
        requestBody || parameters ? (0, createRequestHeader_1.createRequestHeader)("Request") : undefined,
        (0, createParamsDetails_1.createParamsDetails)({ parameters }),
        (0, createRequestBodyDetails_1.createRequestBodyDetails)({
            title: "Body",
            body: requestBody,
        }),
        (0, createStatusCodes_1.createStatusCodes)({ responses }),
        (0, createCallbacks_1.createCallbacks)({ callbacks }),
    ]);
}
function createInfoPageMD({ info: { title, version, description, contact, license, termsOfService, logo, darkLogo, }, securitySchemes, downloadUrl, }) {
    return (0, utils_1.render)([
        `import ApiLogo from "@theme/ApiLogo";\n`,
        `import Heading from "@theme/Heading";\n`,
        `import SchemaTabs from "@theme/SchemaTabs";\n`,
        `import TabItem from "@theme/TabItem";\n`,
        `import Export from "@theme/ApiExplorer/Export";\n\n`,
        (0, createVersionBadge_1.createVersionBadge)(version),
        (0, createDownload_1.createDownload)(downloadUrl),
        (0, createHeading_1.createHeading)(title),
        (0, createLogo_1.createLogo)(logo, darkLogo),
        (0, createDescription_1.createDescription)(description),
        (0, createAuthentication_1.createAuthentication)(securitySchemes),
        (0, createContactInfo_1.createContactInfo)(contact),
        (0, createTermsOfService_1.createTermsOfService)(termsOfService),
        (0, createLicense_1.createLicense)(license),
    ]);
}
function createTagPageMD({ tag: { description } }) {
    return (0, utils_1.render)([(0, createDescription_1.createDescription)(description)]);
}
function createSchemaPageMD({ schema }) {
    const { title = "", description } = schema;
    return (0, utils_1.render)([
        `import Schema from "@theme/Schema";\n`,
        `import Heading from "@theme/Heading";\n\n`,
        (0, createHeading_1.createHeading)(title.replace(utils_1.lessThan, "&lt;").replace(utils_1.greaterThan, "&gt;")),
        (0, createDescription_1.createDescription)(description),
        (0, utils_1.create)("Schema", {
            schema: schema,
            schemaType: "response",
        }),
    ]);
}
