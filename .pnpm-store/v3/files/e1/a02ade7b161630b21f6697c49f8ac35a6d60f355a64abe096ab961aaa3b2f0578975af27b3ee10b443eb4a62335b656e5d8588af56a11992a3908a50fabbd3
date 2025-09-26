/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { isValidElement } from 'react';
export function interpolate(text, values) {
    // eslint-disable-next-line prefer-named-capture-group
    const segments = text.split(/(\{\w+\})/).map((seg, index) => {
        // Odd indices (1, 3, 5...) of the segments are (potentially) interpolatable
        if (index % 2 === 1) {
            const value = values?.[seg.slice(1, -1)];
            if (value !== undefined) {
                return value;
            }
            // No match: add warning? There's no way to "escape" interpolation though
        }
        return seg;
    });
    if (segments.some((seg) => isValidElement(seg))) {
        return segments
            .map((seg, index) => isValidElement(seg) ? React.cloneElement(seg, { key: index }) : seg)
            .filter((seg) => seg !== '');
    }
    return segments.join('');
}
export default function Interpolate({ children, values, }) {
    if (typeof children !== 'string') {
        throw new Error(`The Docusaurus <Interpolate> component only accept simple string values. Received: ${isValidElement(children) ? 'React element' : typeof children}`);
    }
    return <>{interpolate(children, values)}</>;
}
