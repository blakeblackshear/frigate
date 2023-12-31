import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function useOverlayState(key: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentLocationState = location.state;

  const setOverlayStateValue = useCallback(
    (value: string) => {
      const newLocationState = { ...currentLocationState };
      newLocationState[key] = value;
      navigate(location.pathname, { state: newLocationState });
    },
    [navigate]
  );

  const overlayStateValue = location.state && location.state[key];
  return [overlayStateValue, setOverlayStateValue];
}
