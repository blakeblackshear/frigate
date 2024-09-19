import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { usePersistence } from "./use-persistence";

export function useOverlayState<S>(
  key: string,
  defaultValue: S | undefined = undefined,
): [S | undefined, (value: S, replace?: boolean) => void] {
  const location = useLocation();
  const navigate = useNavigate();

  const currentLocationState = useMemo(() => location.state, [location]);

  const setOverlayStateValue = useCallback(
    (value: S, replace: boolean = false) => {
      const newLocationState = { ...currentLocationState };
      newLocationState[key] = value;
      navigate(location.pathname, { state: newLocationState, replace });
    },
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, currentLocationState, navigate],
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
): [
  S | undefined,
  (value: S | undefined, replace?: boolean) => void,
  () => void,
] {
  const location = useLocation();
  const navigate = useNavigate();
  const currentLocationState = useMemo(() => location.state, [location]);

  // currently selected value

  const overlayStateValue = useMemo<S | undefined>(
    () => location.state && location.state[key],
    [location, key],
  );

  // saved value from previous session

  const [persistedValue, setPersistedValue, , deletePersistedValue] =
    usePersistence<S>(key, overlayStateValue);

  const setOverlayStateValue = useCallback(
    (value: S | undefined, replace: boolean = false) => {
      setPersistedValue(value);
      const newLocationState = { ...currentLocationState };
      newLocationState[key] = value;
      navigate(location.pathname, { state: newLocationState, replace });
    },
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, currentLocationState, navigate],
  );

  return [
    overlayStateValue ?? persistedValue ?? defaultValue,
    setOverlayStateValue,
    deletePersistedValue,
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
        navigate(`${location.pathname}#${value}`, { state: location.state });
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

export function useSearchEffect(
  key: string,
  callback: (value: string) => boolean,
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const param = useMemo(() => {
    const param = searchParams.get(key);

    if (!param) {
      return undefined;
    }

    return [key, decodeURIComponent(param)];
  }, [searchParams, key]);

  useEffect(() => {
    if (!param) {
      return;
    }

    const remove = callback(param[1]);

    if (remove) {
      setSearchParams(undefined, { replace: true });
    }
  }, [param, callback, setSearchParams]);
}
