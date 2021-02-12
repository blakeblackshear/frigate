import { useEffect, useMemo, useState } from 'preact/hooks';

export function useResizeObserver(...refs) {
  const [dimensions, setDimensions] = useState(
    new Array(refs.length).fill({ width: 0, height: 0, x: -Infinity, y: -Infinity })
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
      resizeObserver.observe(ref.current);
    });

    return () => {
      refs.forEach((ref) => {
        resizeObserver.unobserve(ref.current);
      });
    };
  }, [refs, resizeObserver]);

  return dimensions;
}
