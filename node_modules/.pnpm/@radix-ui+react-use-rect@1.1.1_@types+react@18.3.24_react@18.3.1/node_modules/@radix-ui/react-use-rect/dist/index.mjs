// packages/react/use-rect/src/use-rect.tsx
import * as React from "react";
import { observeElementRect } from "@radix-ui/rect";
function useRect(measurable) {
  const [rect, setRect] = React.useState();
  React.useEffect(() => {
    if (measurable) {
      const unobserve = observeElementRect(measurable, setRect);
      return () => {
        setRect(void 0);
        unobserve();
      };
    }
    return;
  }, [measurable]);
  return rect;
}
export {
  useRect
};
//# sourceMappingURL=index.mjs.map
