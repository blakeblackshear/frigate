import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePersistence } from "./use-persistence";

export function useOverlayState<S extends string>(
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

export function usePersistedOverlayState<S extends string>(
  key: string,
  defaultValue: S | undefined = undefined,
): [S | undefined, (value: S | undefined, replace?: boolean) => void] {
  const [persistedValue, setPersistedValue] = usePersistence<S>(
    key,
    defaultValue,
  );
  const location = useLocation();
  const navigate = useNavigate();
  const currentLocationState = location.state;

  const setOverlayStateValue = useCallback(
    (value: S | undefined, replace: boolean = false) => {
      setPersistedValue(value);
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

  return [
    overlayStateValue ?? persistedValue ?? defaultValue,
    setOverlayStateValue,
  ];
}

export function useHashState<S extends string>(): [
  S | undefined,
  (value: S) => void,
] {
  const location = useLocation();
  const navigate = useNavigate();

  const setHash = useCallback(
    (value: S | undefined) => {
      if (!value) {
        navigate(location.pathname);
      } else {
        navigate(`${location.pathname}#${value}`);
      }
    },
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location, navigate],
  );

  const hash = useMemo(
    () => location.hash.substring(1) as unknown as S,
    [location.hash],
  );

  return [hash, setHash];
}
