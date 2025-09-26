"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
describe("guard", () => {
    it("should guard empty strings", () => {
        const actual = (0, utils_1.guard)("", (_) => {
            throw new Error("Should not be called");
        });
        expect(actual).toBe("");
    });
    it("should guard undefined", () => {
        const actual = (0, utils_1.guard)(undefined, (value) => {
            throw new Error("Should not be called");
        });
        expect(actual).toBe("");
    });
    it("should guard false booleans", () => {
        const actual = (0, utils_1.guard)(false, (value) => `${value}`);
        expect(actual).toBe("");
    });
    it("should not guard strings", () => {
        const actual = (0, utils_1.guard)("hello", (value) => value);
        expect(actual).toBe("hello");
    });
    it("should not guard numbers", () => {
        const actual = (0, utils_1.guard)(1, (value) => `${value}`);
        expect(actual).toBe("1");
    });
    it("should not guard numbers equals to 0", () => {
        const actual = (0, utils_1.guard)(0, (value) => `${value}`);
        expect(actual).toBe("0");
    });
    it("should not guard true booleans", () => {
        const actual = (0, utils_1.guard)(true, (value) => `${value}`);
        expect(actual).toBe("true");
    });
});
