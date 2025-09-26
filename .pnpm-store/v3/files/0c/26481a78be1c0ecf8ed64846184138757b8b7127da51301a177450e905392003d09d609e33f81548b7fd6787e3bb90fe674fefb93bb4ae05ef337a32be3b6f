/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export type HtmlMinifierType = 'swc' | 'terser';
export type HtmlMinifierResult = {
    code: string;
    warnings: string[];
};
export type HtmlMinifier = {
    minify: (html: string) => Promise<HtmlMinifierResult>;
};
export declare function getHtmlMinifier({ type, }: {
    type: HtmlMinifierType;
}): Promise<HtmlMinifier>;
//# sourceMappingURL=minifyHtml.d.ts.map