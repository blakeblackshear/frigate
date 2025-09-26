/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export class DefaultAstNodeLocator {
    constructor() {
        this.segmentSeparator = '/';
        this.indexSeparator = '@';
    }
    getAstNodePath(node) {
        if (node.$container) {
            const containerPath = this.getAstNodePath(node.$container);
            const newSegment = this.getPathSegment(node);
            const nodePath = containerPath + this.segmentSeparator + newSegment;
            return nodePath;
        }
        return '';
    }
    getPathSegment({ $containerProperty, $containerIndex }) {
        if (!$containerProperty) {
            throw new Error("Missing '$containerProperty' in AST node.");
        }
        if ($containerIndex !== undefined) {
            return $containerProperty + this.indexSeparator + $containerIndex;
        }
        return $containerProperty;
    }
    getAstNode(node, path) {
        const segments = path.split(this.segmentSeparator);
        return segments.reduce((previousValue, currentValue) => {
            if (!previousValue || currentValue.length === 0) {
                return previousValue;
            }
            const propertyIndex = currentValue.indexOf(this.indexSeparator);
            if (propertyIndex > 0) {
                const property = currentValue.substring(0, propertyIndex);
                const arrayIndex = parseInt(currentValue.substring(propertyIndex + 1));
                const array = previousValue[property];
                return array === null || array === void 0 ? void 0 : array[arrayIndex];
            }
            return previousValue[currentValue];
        }, node);
    }
}
//# sourceMappingURL=ast-node-locator.js.map