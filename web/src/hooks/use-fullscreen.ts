import { RefObject, useCallback, useEffect, useState } from "react";
import nosleep from "nosleep.js";

const NoSleep = new nosleep();

function getFullscreenElement(): HTMLElement | null {
  return (
    document.fullscreenElement ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).webkitFullscreenElement ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).mozFullScreenElement ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).msFullscreenElement
  );
}

function exitFullscreen(): Promise<void> | null {
  if (document.exitFullscreen) return document.exitFullscreen();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any).msExitFullscreen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (document as any).msExitFullscreen();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any).webkitExitFullscreen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (document as any).webkitExitFullscreen();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any).mozCancelFullScreen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (document as any).mozCancelFullScreen();
  return null;
}

function enterFullScreen(element: HTMLElement): Promise<void> | null {
  if (element.requestFullscreen) return element.requestFullscreen();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((element as any).msRequestFullscreen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (element as any).msRequestFullscreen();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((element as any).webkitEnterFullscreen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (element as any).webkitEnterFullscreen();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((element as any).webkitRequestFullscreen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (element as any).webkitRequestFullscreen();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((element as any).mozRequestFullscreen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (element as any).mozRequestFullscreen();
  return null;
}

const prefixes = ["", "webkit", "moz", "ms"];

function addEventListeners(
  element: HTMLElement,
  onFullScreen: (event: Event) => void,
  onError: (event: Event) => void,
) {
  prefixes.forEach((prefix) => {
    element.addEventListener(`${prefix}fullscreenchange`, onFullScreen);
    element.addEventListener(`${prefix}fullscreenerror`, onError);
  });
}

function removeEventListeners(
  element: HTMLElement,
  onFullScreen: (event: Event) => void,
  onError: (event: Event) => void,
) {
  prefixes.forEach((prefix) => {
    element.removeEventListener(`${prefix}fullscreenchange`, onFullScreen);
    element.removeEventListener(`${prefix}fullscreenerror`, onError);
  });
}

export function useFullscreen<T extends HTMLElement = HTMLElement>(
  elementRef: RefObject<T>,
) {
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const handleFullscreenChange = useCallback((event: Event) => {
    setFullscreen(event.target === getFullscreenElement());
  }, []);

  const handleFullscreenError = useCallback((event: Event) => {
    setFullscreen(false);
    setError(
      new Error(
        `Error attempting full-screen mode: ${event} (${event.target})`,
      ),
    );
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!getFullscreenElement()) {
        NoSleep.enable();
        await enterFullScreen(elementRef.current!);
      } else {
        await exitFullscreen();
        NoSleep.disable();
      }
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }, [elementRef]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "F11") {
        toggleFullscreen();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleFullscreen]);

  useEffect(() => {
    const currentElement = elementRef.current;
    if (currentElement) {
      addEventListeners(
        currentElement,
        handleFullscreenChange,
        handleFullscreenError,
      );
      return () => {
        removeEventListeners(
          currentElement,
          handleFullscreenChange,
          handleFullscreenError,
        );
      };
    }
  }, [elementRef, handleFullscreenChange, handleFullscreenError]);

  return { fullscreen, toggleFullscreen, error, clearError };
}
