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

  useEffect(() => {
    refs.forEach((ref) => {
      if (ref instanceof Window) {
        resizeObserver.observe(document.body);
      } else if (ref.current) {
        resizeObserver.observe(ref.current);
      }
    });

    return () => {
      refs.forEach((ref) => {
        if (ref instanceof Window) {
          resizeObserver.unobserve(document.body);
        } else if (ref.current) {
          resizeObserver.unobserve(ref.current);
        }
      });
    };
  }, [refs, resizeObserver]);

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
