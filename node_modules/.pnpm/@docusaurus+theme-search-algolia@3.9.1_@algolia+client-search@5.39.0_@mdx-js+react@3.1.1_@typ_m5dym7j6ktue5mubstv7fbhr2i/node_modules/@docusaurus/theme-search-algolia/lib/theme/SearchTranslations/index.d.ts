/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { DocSearchTranslations } from '@docsearch/react';
declare const translations: DocSearchTranslations & {
    placeholder: string;
    modal: {
        searchBox: {
            placeholderText: string;
            placeholderTextAskAi: string;
            placeholderTextAskAiStreaming: string;
            enterKeyHintAskAi: string;
            searchInputLabel: string;
            backToKeywordSearchButtonText: string;
            backToKeywordSearchButtonAriaLabel: string;
            enterKeyHint: string;
            clearButtonTitle: string;
            clearButtonAriaLabel: string;
            closeButtonText: string;
            resetButtonTitle: string;
            resetButtonAriaLabel: string;
            cancelButtonText: string;
            cancelButtonAriaLabel: string;
            closeButtonAriaLabel: string;
        };
        startScreen: {
            recentConversationsTitle: string;
            removeRecentConversationButtonTitle: string;
        };
        resultsScreen: {
            askAiPlaceholder: string;
        };
        askAiScreen: {
            disclaimerText: string;
            relatedSourcesText: string;
            thinkingText: string;
            copyButtonText: string;
            copyButtonCopiedText: string;
            copyButtonTitle: string;
            likeButtonTitle: string;
            dislikeButtonTitle: string;
            thanksForFeedbackText: string;
            preToolCallText: string;
            duringToolCallText: string;
            afterToolCallText: string;
        };
        footer: {
            submitQuestionText: string;
            poweredByText: string;
            backToSearchText: string;
            searchByText: string;
        };
    };
};
export default translations;
