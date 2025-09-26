/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { AskAiConfig } from '@docusaurus/theme-search-algolia';
import type { DocSearchModalProps, DocSearchTranslations } from '@docsearch/react';
interface DocSearchV4PropsLite {
    indexName: string;
    apiKey: string;
    appId: string;
    placeholder?: string;
    translations?: DocSearchTranslations;
    searchParameters?: DocSearchModalProps['searchParameters'];
    askAi?: AskAiConfig;
}
type UseAskAiResult = {
    canHandleAskAi: boolean;
    isAskAiActive: boolean;
    currentPlaceholder: string | undefined;
    onAskAiToggle: (active: boolean) => void;
    askAi?: AskAiConfig;
    extraAskAiProps: Partial<DocSearchModalProps> & {
        askAi?: AskAiConfig;
        canHandleAskAi?: boolean;
        isAskAiActive?: boolean;
        onAskAiToggle?: (active: boolean) => void;
    };
};
export declare function useAlgoliaAskAi(props: DocSearchV4PropsLite): UseAskAiResult;
export {};
