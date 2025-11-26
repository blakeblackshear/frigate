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
        window.history.pushState({ overlayOpen: true }, "");
        historyPushedRef.current = true;
      }

      const handlePopState = () => {
        closedByBackRef.current = true;
        historyPushedRef.current = false;
        onCloseRef.current();
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    } else {
      // Overlay is closing - clean up history if we pushed and it wasn't via back button
      if (historyPushedRef.current && !closedByBackRef.current) {
        window.history.back();
      }
      historyPushedRef.current = false;
      closedByBackRef.current = false;
    }
  }, [enabled, open]);
}
