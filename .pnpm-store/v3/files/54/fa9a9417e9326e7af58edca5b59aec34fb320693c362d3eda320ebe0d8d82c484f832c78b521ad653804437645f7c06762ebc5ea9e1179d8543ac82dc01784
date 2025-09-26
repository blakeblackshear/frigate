import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutationObserver } from './useMutationObserver';
// Callback fires when the "hidden" attribute of a tabpanel changes
// See https://github.com/facebook/docusaurus/pull/7485
function useTabBecameVisibleCallback(codeBlockRef, callback) {
    const [hiddenTabElement, setHiddenTabElement] = useState();
    const updateHiddenTabElement = useCallback(() => {
        // No need to observe non-hidden tabs
        // + we want to force a re-render when a tab becomes visible
        setHiddenTabElement(codeBlockRef.current?.closest('[role=tabpanel][hidden]'));
    }, [codeBlockRef, setHiddenTabElement]);
    useEffect(() => {
        updateHiddenTabElement();
    }, [updateHiddenTabElement]);
    useMutationObserver(hiddenTabElement, (mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' &&
                mutation.attributeName === 'hidden') {
                callback();
                updateHiddenTabElement();
            }
        });
    }, {
        attributes: true,
        characterData: false,
        childList: false,
        subtree: false,
    });
}
export function useCodeWordWrap() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isCodeScrollable, setIsCodeScrollable] = useState(false);
    const codeBlockRef = useRef(null);
    const toggle = useCallback(() => {
        const codeElement = codeBlockRef.current.querySelector('code');
        if (isEnabled) {
            codeElement.removeAttribute('style');
        }
        else {
            codeElement.style.whiteSpace = 'pre-wrap';
            // When code wrap is enabled, we want to avoid a scrollbar in any case
            // Ensure that very very long words/strings/tokens still wrap
            codeElement.style.overflowWrap = 'anywhere';
        }
        setIsEnabled((value) => !value);
    }, [codeBlockRef, isEnabled]);
    const updateCodeIsScrollable = useCallback(() => {
        const { scrollWidth, clientWidth } = codeBlockRef.current;
        const isScrollable = scrollWidth > clientWidth ||
            codeBlockRef.current.querySelector('code').hasAttribute('style');
        setIsCodeScrollable(isScrollable);
    }, [codeBlockRef]);
    useTabBecameVisibleCallback(codeBlockRef, updateCodeIsScrollable);
    useEffect(() => {
        updateCodeIsScrollable();
    }, [isEnabled, updateCodeIsScrollable]);
    useEffect(() => {
        window.addEventListener('resize', updateCodeIsScrollable, {
            passive: true,
        });
        return () => {
            window.removeEventListener('resize', updateCodeIsScrollable);
        };
    }, [updateCodeIsScrollable]);
    return { codeBlockRef, isEnabled, isCodeScrollable, toggle };
}
//# sourceMappingURL=useCodeWordWrap.js.map