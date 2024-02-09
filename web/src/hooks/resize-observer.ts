import { MutableRefObject, useEffect, useMemo, useState } from "react";

export function useResizeObserver(...refs: MutableRefObject<Element | null>[]) {
  const [dimensions, setDimensions] = useState(
    new Array(refs.length).fill({
      width: 0,
      height: 0,
      x: -Infinity,
      y: -Infinity,
    })
  );
  const resizeObserver = useMemo(
    () =>
      new ResizeObserver((entries) => {
        window.requestAnimationFrame(() => {
          setDimensions(entries.map((entry) => entry.contentRect));
        });
      }),
    []
  );

  useEffect(() => {
    refs.forEach((ref) => {
      if (ref.current) {
        resizeObserver.observe(ref.current);
      }
    });

    return () => {
      refs.forEach((ref) => {
        if (ref.current) {
          resizeObserver.unobserve(ref.current);
        }
      });
    };
  }, [refs, resizeObserver]);

  return dimensions;
}
