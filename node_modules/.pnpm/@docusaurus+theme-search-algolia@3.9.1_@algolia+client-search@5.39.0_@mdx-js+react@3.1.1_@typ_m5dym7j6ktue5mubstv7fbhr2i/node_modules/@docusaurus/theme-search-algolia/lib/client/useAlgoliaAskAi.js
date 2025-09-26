/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useCallback, useMemo, useState } from 'react';
import { version as docsearchVersion } from '@docsearch/react/version';
import translations from '@theme/SearchTranslations';
import { useAlgoliaContextualFacetFiltersIfEnabled } from './useAlgoliaContextualFacetFilters';
import { mergeFacetFilters } from './utils';
const isV4 = docsearchVersion.startsWith('4.');
// We need to apply contextualSearch facetFilters to AskAI filters
// This can't be done at config normalization time because contextual filters
// can only be determined at runtime
function applyAskAiContextualSearch(askAi, contextualSearchFilters) {
    if (!askAi) {
        return undefined;
    }
    if (!contextualSearchFilters) {
        return askAi;
    }
    const askAiFacetFilters = askAi.searchParameters?.facetFilters;
    return {
        ...askAi,
        searchParameters: {
            ...askAi.searchParameters,
            facetFilters: mergeFacetFilters(askAiFacetFilters, contextualSearchFilters),
        },
    };
}
export function useAlgoliaAskAi(props) {
    const [isAskAiActive, setIsAskAiActive] = useState(false);
    const contextualSearchFilters = useAlgoliaContextualFacetFiltersIfEnabled();
    const askAi = useMemo(() => {
        return applyAskAiContextualSearch(props.askAi, contextualSearchFilters);
    }, [props.askAi, contextualSearchFilters]);
    const canHandleAskAi = Boolean(askAi);
    const currentPlaceholder = isAskAiActive && isV4
        ? translations.modal?.searchBox?.placeholderTextAskAi
        : translations.modal?.searchBox?.placeholderText || props?.placeholder;
    const onAskAiToggle = useCallback((askAiToggle) => {
        setIsAskAiActive(askAiToggle);
    }, []);
    const extraAskAiProps = {
        askAi,
        canHandleAskAi,
        isAskAiActive,
        onAskAiToggle,
    };
    return {
        canHandleAskAi,
        isAskAiActive,
        currentPlaceholder,
        onAskAiToggle,
        askAi,
        extraAskAiProps,
    };
}
