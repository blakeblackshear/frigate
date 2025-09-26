/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { SSGParams } from './ssgParams';
import type { AppRenderResult } from '../common';
export type SSGTemplateData = {
    appHtml: string;
    baseUrl: string;
    htmlAttributes: string;
    bodyAttributes: string;
    headTags: string;
    preBodyTags: string;
    postBodyTags: string;
    metaAttributes: string[];
    scripts: string[];
    stylesheets: string[];
    noIndex: boolean;
    version: string;
};
export type SSGTemplateCompiled = (data: SSGTemplateData) => string;
export declare function compileSSGTemplate(template: string): Promise<SSGTemplateCompiled>;
export declare function renderSSGTemplate({ params, result, ssgTemplate, }: {
    params: SSGParams;
    result: AppRenderResult;
    ssgTemplate: SSGTemplateCompiled;
}): string;
export declare function renderHashRouterTemplate({ params, }: {
    params: SSGParams;
}): Promise<string>;
