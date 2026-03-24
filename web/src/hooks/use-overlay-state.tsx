import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { usePersistence } from "./use-persistence";
import { useUserPersistence } from "./use-user-persistence";
import { AuthContext } from "@/context/auth-context";

export function useOverlayState<S>(
  key: string,
  defaultValue: S | undefined = undefined,
  preserveSearch: boolean = true,
): [S | undefined, (value: S, replace?: boolean) => void] {
  const location = useLocation();
  const navigate = useNavigate();

  const locationRef = useRef(location);
  locationRef.current = location;

  const setOverlayStateValue = useCallback(
    (value: S, replace: boolean = false) => {
      const loc = locationRef.current;
      const currentValue = loc.state?.[key] as S | undefined;

      if (Object.is(currentValue, value)) {
        return;
      }

      const newLocationState = { ...loc.state };
      newLocationState[key] = value;
      navigate(loc.pathname + (preserveSearch ? loc.search : ""), {
        state: newLocationState,
        replace,
      });
    },
    // locationRef is stable so we don't need it in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, navigate, preserveSearch],
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
  boolean,
  () => void,
] {
  const location = useLocation();
  const navigate = useNavigate();

  const locationRef = useRef(location);
  locationRef.current = location;

  // currently selected value

  const overlayStateValue = useMemo<S | undefined>(
    () => location.state && location.state[key],
    [location, key],
  );

  // saved value from previous session

  const [persistedValue, setPersistedValue, loaded, deletePersistedValue] =
    usePersistence<S>(key, overlayStateValue);

  const setOverlayStateValue = useCallback(
    (value: S | undefined, replace: boolean = false) => {
      const loc = locationRef.current;
      const currentValue = loc.state?.[key] as S | undefined;

      if (Object.is(currentValue, value)) {
        return;
      }

      setPersistedValue(value);
      const newLocationState = { ...loc.state };
      newLocationState[key] = value;
      navigate(loc.pathname, { state: newLocationState, replace });
    },
    // locationRef is stable so we don't need it in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, navigate, setPersistedValue],
  );

  return [
    overlayStateValue ?? persistedValue ?? defaultValue,
    setOverlayStateValue,
    loaded,
    deletePersistedValue,
  ];
}

/**
 * Like usePersistedOverlayState, but namespaces the persistence key by username.
 * This ensures different users on the same browser don't share state.
 * Automatically migrates data from legacy (non-namespaced) keys on first use.
 */
export function useUserPersistedOverlayState<S extends string>(
  key: string,
  defaultValue: S | undefined = undefined,
): [
  S | undefined,
  (value: S | undefined, replace?: boolean) => void,
  boolean,
  () => void,
] {
  const { auth } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const locationRef = useRef(location);
  locationRef.current = location;

  // currently selected value from URL state
  const overlayStateValue = useMemo<S | undefined>(
    () => location.state && location.state[key],
    [location, key],
  );

  // saved value from previous session (user-namespaced with migration)
  const [persistedValue, setPersistedValue, loaded, deletePersistedValue] =
    useUserPersistence<S>(key, overlayStateValue);

  const setOverlayStateValue = useCallback(
    (value: S | undefined, replace: boolean = false) => {
      const loc = locationRef.current;
      const currentValue = loc.state?.[key] as S | undefined;

      if (Object.is(currentValue, value)) {
        return;
      }

      setPersistedValue(value);
      const newLocationState = { ...loc.state };
      newLocationState[key] = value;
      navigate(loc.pathname, { state: newLocationState, replace });
    },
    // locationRef is stable so we don't need it in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, navigate, setPersistedValue],
  );

  // Don't return a value until auth has finished loading
  if (auth.isLoading) {
    return [undefined, setOverlayStateValue, false, deletePersistedValue];
  }

  return [
    overlayStateValue ?? persistedValue ?? defaultValue,
    setOverlayStateValue,
    loaded,
    deletePersistedValue,
  ];
}

export function useHashState<S extends string>(): [
  S | undefined,
  (value: S) => void,
] {
  const location = useLocation();
  const navigate = useNavigate();

  const locationRef = useRef(location);
  locationRef.current = location;

  const setHash = useCallback(
    (value: S | undefined) => {
      const loc = locationRef.current;
      if (!value) {
        navigate(loc.pathname);
      } else {
        navigate(`${loc.pathname}#${value}`, { state: loc.state });
      }
    },
    // locationRef is stable so we don't need it in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
      navigate(location.pathname + location.hash, {
        state: location.state,
        replace: true,
      });
    }
  }, [
    param,
    location.state,
    location.pathname,
    location.hash,
    callback,
    navigate,
  ]);
}
