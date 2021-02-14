import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

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

export function useIntersectionObserver() {
  const [entry, setEntry] = useState({});
  const [node, setNode] = useState(null);

  const observer = useRef(null);

  useEffect(() => {
    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver((entries) => {
      window.requestAnimationFrame(() => {
        setEntry(entries[0]);
      });
    });

    if (node) {
      observer.current.observe(node);
    }

    return () => {
      observer.current.disconnect();
    };
  }, [node]);

  return [entry, setNode];
}
