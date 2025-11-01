import { useCallback, useEffect, useRef, useState } from "react";

type UseUserInteractionProps = {
  elementRef: React.RefObject<HTMLElement>;
};

function useUserInteraction({ elementRef }: UseUserInteractionProps) {
  const [userInteracting, setUserInteracting] = useState(false);
  const interactionTimeout = useRef<NodeJS.Timeout>();
  const isProgrammaticScroll = useRef(false);

  const setProgrammaticScroll = useCallback(() => {
    isProgrammaticScroll.current = true;
  }, []);

  useEffect(() => {
    const handleUserInteraction = () => {
      if (!isProgrammaticScroll.current) {
        setUserInteracting(true);

        if (interactionTimeout.current) {
          clearTimeout(interactionTimeout.current);
        }

        interactionTimeout.current = setTimeout(() => {
          setUserInteracting(false);
        }, 3000);
      } else {
        isProgrammaticScroll.current = false;
      }
    };

    const element = elementRef.current;

    if (element) {
      element.addEventListener("scroll", handleUserInteraction);
      element.addEventListener("mousedown", handleUserInteraction);
      element.addEventListener("mouseup", handleUserInteraction);
      element.addEventListener("touchstart", handleUserInteraction);
      element.addEventListener("touchmove", handleUserInteraction);
      element.addEventListener("touchend", handleUserInteraction);

      return () => {
        element.removeEventListener("scroll", handleUserInteraction);
        element.removeEventListener("mousedown", handleUserInteraction);
        element.removeEventListener("mouseup", handleUserInteraction);
        element.removeEventListener("touchstart", handleUserInteraction);
        element.removeEventListener("touchmove", handleUserInteraction);
        element.removeEventListener("touchend", handleUserInteraction);
      };
    }
  }, [elementRef]);

  return { userInteracting, setProgrammaticScroll };
}

export default useUserInteraction;
