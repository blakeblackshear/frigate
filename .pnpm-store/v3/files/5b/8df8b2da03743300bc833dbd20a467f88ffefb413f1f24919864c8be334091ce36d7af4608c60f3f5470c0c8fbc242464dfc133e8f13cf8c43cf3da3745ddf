"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenJSON = void 0;
const buffer_1 = require("../vendor/node/internal/buffer");
const path_1 = require("../vendor/node/path");
const pathJoin = path_1.posix ? path_1.posix.join : path_1.join;
const flattenJSON = (nestedJSON) => {
    const flatJSON = {};
    function flatten(pathPrefix, node) {
        for (const path in node) {
            const contentOrNode = node[path];
            // TODO: Can we avoid using `join` here? Just concatenate?
            const joinedPath = pathJoin(pathPrefix, path);
            if (typeof contentOrNode === 'string' || contentOrNode instanceof buffer_1.Buffer) {
                flatJSON[joinedPath] = contentOrNode;
            }
            else if (typeof contentOrNode === 'object' &&
                contentOrNode !== null &&
                !(contentOrNode instanceof buffer_1.Buffer) &&
                Object.keys(contentOrNode).length > 0) {
                // empty directories need an explicit entry and therefore get handled in `else`, non-empty ones are implicitly considered
                flatten(joinedPath, contentOrNode);
            }
            else {
                // without this branch null, empty-object or non-object entries would not be handled in the same way
                // by both fromJSON() and fromNestedJSON()
                flatJSON[joinedPath] = null;
            }
        }
    }
    flatten('', nestedJSON);
    return flatJSON;
};
exports.flattenJSON = flattenJSON;
//# sourceMappingURL=json.js.map