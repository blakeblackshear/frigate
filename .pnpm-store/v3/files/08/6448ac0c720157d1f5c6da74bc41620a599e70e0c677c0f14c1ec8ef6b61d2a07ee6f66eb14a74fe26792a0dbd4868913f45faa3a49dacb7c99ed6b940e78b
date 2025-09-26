"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
// eslint-disable-next-line import/no-extraneous-dependencies
const utils_1 = require("@docusaurus/utils");
const _1 = require(".");
// npx jest packages/docusaurus-plugin-openapi/src/openapi/openapi.test.ts --watch
describe("openapi", () => {
    describe("readOpenapiFiles", () => {
        it("readOpenapiFiles", async () => {
            var _a, _b;
            const results = await (0, _1.readOpenapiFiles)((0, utils_1.posixPath)(path_1.default.join(__dirname, "__fixtures__/examples")));
            const categoryMeta = results.find((x) => x.source.endsWith("_category_.json"));
            expect(categoryMeta).toBeFalsy();
            // console.log(results);
            const yaml = results.find((x) => x.source.endsWith("openapi.yaml"));
            expect(yaml).toBeTruthy();
            expect(yaml === null || yaml === void 0 ? void 0 : yaml.sourceDirName).toBe(".");
            expect(yaml === null || yaml === void 0 ? void 0 : yaml.data.tags).toBeDefined();
            expect(yaml === null || yaml === void 0 ? void 0 : yaml.data["x-tagGroups"]).toBeDefined();
            expect((_b = (_a = yaml === null || yaml === void 0 ? void 0 : yaml.data.components) === null || _a === void 0 ? void 0 : _a.schemas) === null || _b === void 0 ? void 0 : _b.HelloString["x-tags"]).toBeDefined();
        });
    });
});
