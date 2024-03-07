import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function useOverlayState<S extends string>(
  key: string,
  defaultValue: S | undefined = undefined,
): [S | undefined, (value: S, replace?: boolean) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const currentLocationState = location.state;

  const setOverlayStateValue = useCallback(
    (value: S, replace: boolean = false) => {
      const newLocationState = { ...currentLocationState };
      newLocationState[key] = value;
      navigate(location.pathname, { state: newLocationState, replace });
    },
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, navigate],
  );

  const overlayStateValue = useMemo<S | undefined>(
    () => location.state && location.state[key],
    [location, key],
  );

  return [overlayStateValue ?? defaultValue, setOverlayStateValue];
}
