import * as React from "react";

interface UseHistoryBackOptions {
  enabled: boolean;
  open: boolean;
  onClose: () => void;
}

/**
 * Hook that manages browser history for overlay components (dialogs, sheets, etc.)
 * When enabled, pressing the browser back button will close the overlay instead of navigating away.
 */
export function useHistoryBack({
  enabled,
  open,
  onClose,
}: UseHistoryBackOptions): void {
  const historyPushedRef = React.useRef(false);
  const closedByBackRef = React.useRef(false);
  const urlWhenOpenedRef = React.useRef<string | null>(null);

  // Keep onClose in a ref to avoid effect re-runs that cause multiple history pushes
  const onCloseRef = React.useRef(onClose);
  React.useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  React.useEffect(() => {
    if (!enabled) return;

    if (open) {
      // Only push history state if we haven't already (prevents duplicates in strict mode)
      if (!historyPushedRef.current) {
        // Store the current URL (pathname + search, without hash) before pushing history state
        urlWhenOpenedRef.current =
          window.location.pathname + window.location.search;
        window.history.pushState({ overlayOpen: true }, "");
        historyPushedRef.current = true;
      }

      const handlePopState = () => {
        closedByBackRef.current = true;
        historyPushedRef.current = false;
        urlWhenOpenedRef.current = null;
        onCloseRef.current();
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    } else {
      // Overlay is closing - clean up history if we pushed and it wasn't via back button
      if (historyPushedRef.current && !closedByBackRef.current) {
        const currentUrl = window.location.pathname + window.location.search;
        const urlWhenOpened = urlWhenOpenedRef.current;

        // If the URL has changed (e.g., filters were applied via search params),
        // don't go back as it would undo the filter update.
        // The history entry we pushed will remain, but that's acceptable compared
        // to losing the user's filter changes.
        if (!urlWhenOpened || currentUrl === urlWhenOpened) {
          // URL hasn't changed, safe to go back and remove our history entry
          window.history.back();
        }
        // If URL changed, we skip history.back() to preserve the filter updates
      }
      historyPushedRef.current = false;
      closedByBackRef.current = false;
      urlWhenOpenedRef.current = null;
    }
  }, [enabled, open]);
}
