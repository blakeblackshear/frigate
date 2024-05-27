import { useState, useEffect, useCallback, useRef } from "react";

type OptimisticStateResult<T> = [T, (newValue: T) => void];

const useOptimisticState = <T>(
  currentState: T,
  setState: (newValue: T) => void,
  delay: number = 20,
): OptimisticStateResult<T> => {
  const [optimisticValue, setOptimisticValue] = useState<T>(currentState);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleValueChange = useCallback(
    (newValue: T) => {
      // Update the optimistic value immediately
      setOptimisticValue(newValue);

      // Clear any pending debounce timeout
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      // Set a new debounce timeout
      debounceTimeout.current = setTimeout(() => {
        // Update the actual value using the provided setter function
        setState(newValue);
      }, delay);
    },
    [delay, setState],
  );

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentState != optimisticValue) {
      setOptimisticValue(currentState);
    }
    // sometimes an external action will cause the currentState to change
    // without handleValueChange being called. In this case
    // we need to update the optimistic value so the UI reflects the change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentState]);

  return [optimisticValue, handleValueChange];
};

export default useOptimisticState;
