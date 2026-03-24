import { MutableRefObject, useEffect, useMemo, useState } from "react";

type RefType = MutableRefObject<Element | null> | Window;

export function useResizeObserver(...refs: RefType[]) {
  const [dimensions, setDimensions] = useState<
    { width: number; height: number; x: number; y: number }[]
  >(
    new Array(refs.length).fill({
      width: 0,
      height: 0,
      x: -Infinity,
      y: -Infinity,
    }),
  );
  const resizeObserver = useMemo(
    () =>
      new ResizeObserver((entries) => {
        window.requestAnimationFrame(() => {
          setDimensions((prevDimensions) => {
            const newDimensions = entries.map((entry) => entry.contentRect);
            if (
              JSON.stringify(prevDimensions) !== JSON.stringify(newDimensions)
            ) {
              return newDimensions;
            }
            return prevDimensions;
          });
        });
      }),
    [],
  );

  // Resolve refs to actual DOM elements for use as stable effect dependencies.
  // Rest params create a new array each call, but the underlying elements are
  // stable DOM nodes, so spreading them into the dep array avoids re-running
  // the effect on every render.
  const elements = refs.map((ref) =>
    ref instanceof Window ? document.body : ref.current,
  );

  useEffect(() => {
    elements.forEach((el) => {
      if (el) resizeObserver.observe(el);
    });

    return () => {
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...elements, resizeObserver]);

  if (dimensions.length == refs.length) {
    return dimensions;
  } else {
    const items = [...dimensions];
    for (let i = dimensions.length; i < refs.length; i++) {
      items.push({
        width: 0,
        height: 0,
        x: -Infinity,
        y: -Infinity,
      });
    }

    return items;
  }
}
