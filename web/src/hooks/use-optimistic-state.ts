import { useState, useEffect, useCallback } from "react";

type OptimisticStateResult<T> = [T, (newValue: T) => void];

const useOptimisticState = <T>(
  currentState: T,
  setState: (newValue: T) => void,
  delay: number = 20,
): OptimisticStateResult<T> => {
  const [optimisticValue, setOptimisticValue] = useState<T>(currentState);

  const handleValueChange = useCallback((newValue: T) => {
    // Update the optimistic value immediately
    setOptimisticValue(newValue);
  }, []);

  // Push the optimistic value to the real setter after the delay. Scoping
  // this to an effect keyed on optimisticValue ensures the cleanup only
  // cancels the timer for the value it scheduled — so StrictMode's
  // effect-rerun (and future re-running mechanisms) reschedules cleanly
  // instead of dropping the pending update on the floor.
  useEffect(() => {
    if (Object.is(optimisticValue, currentState)) {
      return;
    }
    const id = setTimeout(() => setState(optimisticValue), delay);
    return () => clearTimeout(id);
  }, [optimisticValue, currentState, delay, setState]);

  // External updates to currentState should win over a stale optimistic value.
  // The guard matters under StrictMode: this effect's re-run captures the
  // *old* currentState in its closure, so without the equality check it
  // would clobber an optimistic update that another effect (e.g. a search
  // param sync) made earlier in the same commit.
  useEffect(() => {
    if (!Object.is(currentState, optimisticValue)) {
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
