// packages/react/use-escape-keydown/src/use-escape-keydown.tsx
import * as React from "react";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
function useEscapeKeydown(onEscapeKeyDownProp, ownerDocument = globalThis?.document) {
  const onEscapeKeyDown = useCallbackRef(onEscapeKeyDownProp);
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onEscapeKeyDown(event);
      }
    };
    ownerDocument.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => ownerDocument.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [onEscapeKeyDown, ownerDocument]);
}
export {
  useEscapeKeydown
};
//# sourceMappingURL=index.mjs.map
