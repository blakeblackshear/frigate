import { useCallback } from "react";

interface TapUtils {
  handleTouchStart: (
    event: React.TouchEvent<Element>,
    onClick: () => void,
  ) => void;
}

const useTapUtils = (): TapUtils => {
  const handleTouchStart = useCallback(
    (event: React.TouchEvent<Element>, onClick: () => void) => {
      event.preventDefault();

      const element = event.target as Element;
      const { clientX, clientY } = event.changedTouches[0];

      // Determine if the touch is within the element's bounds
      const rect = element.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        // Call the onClick handler
        onClick();
      }
    },
    [],
  );

  return { handleTouchStart };
};

export default useTapUtils;
