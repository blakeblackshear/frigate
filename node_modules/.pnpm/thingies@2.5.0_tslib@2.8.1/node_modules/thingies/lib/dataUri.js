"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataUri = void 0;
/**
 * Creates a data URI from a string of data.
 *
 * @param data The data to convert to a data URI.
 * @param mime The MIME type of the data.
 * @returns The data URI.
 */
const dataUri = (data, mime) => `data:${mime};utf8,${encodeURIComponent(data)}`;
exports.dataUri = dataUri;
