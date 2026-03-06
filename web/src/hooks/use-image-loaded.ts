import { useCallback, useEffect, useRef, useState } from "react";

const useImageLoaded = (): [
  React.RefObject<HTMLImageElement | null>,
  boolean,
  () => void,
] => {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  const onLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (ref.current?.complete) {
      onLoad();
    }
  }, [onLoad]);

  return [ref, loaded, onLoad];
};

export default useImageLoaded;
