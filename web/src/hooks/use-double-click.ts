import { useEffect, MutableRefObject } from "react";

/**
 * A simple React hook for differentiating single and double clicks on the same component.
 *
 * @param ref Dom node to watch for double clicks
 * @param latency The amount of time (in milliseconds) to wait before differentiating a single from a double click
 * @param onSingleClick A callback function for single click events
 * @param onDoubleClick A callback function for double click events
 */
const useDoubleClick = ({
  ref,
  latency = 300,
  onSingleClick = () => null,
  onDoubleClick = () => null,
}: {
  ref: MutableRefObject<HTMLElement>;
  latency?: number;
  onSingleClick?: (e: MouseEvent) => void;
  onDoubleClick?: (e: MouseEvent) => void;
}) => {
  useEffect(() => {
    const clickRef = ref.current;
    let clickCount = 0;
    const handleClick = (e: MouseEvent) => {
      clickCount += 1;

      setTimeout(() => {
        if (clickCount === 1) onSingleClick(e);
        else if (clickCount === 2) onDoubleClick(e);

        clickCount = 0;
      }, latency);
    };

    // Add event listener for click events
    if (clickRef) {
      clickRef.addEventListener("click", handleClick);
    }

    // Remove event listener
    return () => {
      if (clickRef) {
        clickRef.removeEventListener("click", handleClick);
      }
    };
  }, [ref, latency, onSingleClick, onDoubleClick]);
};

export default useDoubleClick;
