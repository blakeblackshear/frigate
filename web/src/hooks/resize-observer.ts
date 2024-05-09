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
          setDimensions(entries.map((entry) => entry.contentRect));
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

  return dimensions;
}

export function useOverflowObserver(ref: MutableRefObject<HTMLElement | null>) {
  const [overflow, setOverflow] = useState<boolean>(false);
  const resizeObserver = useMemo(
    () =>
      new ResizeObserver(() => {
        window.requestAnimationFrame(() => {
          if (ref.current) {
            setOverflow(ref.current.scrollWidth > ref.current.clientWidth);
          }
        });
      }),
    [ref],
  );

  useEffect(() => {
    const elem = ref.current;

    if (elem) {
      resizeObserver.observe(elem);
    }

    return () => {
      if (elem) {
        resizeObserver.unobserve(elem);
      }
    };
  }, [ref, resizeObserver]);

  return overflow;
}
