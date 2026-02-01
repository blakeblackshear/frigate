import { useBirdseyeLayout } from "@/api/ws";
import CameraFeatureToggle from "@/components/dynamic/CameraFeatureToggle";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import BirdseyeLivePlayer from "@/components/player/BirdseyeLivePlayer";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useResizeObserver } from "@/hooks/resize-observer";
import { cn } from "@/lib/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isDesktop,
  isFirefox,
  isIOS,
  isMobile,
  isSafari,
  useMobileOrientation,
} from "react-device-detect";
import { useTranslation } from "react-i18next";
import { FaCompress, FaExpand } from "react-icons/fa";
import { IoMdArrowBack } from "react-icons/io";
import { LuPictureInPicture } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import useSWR from "swr";

type LiveBirdseyeViewProps = {
  supportsFullscreen: boolean;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  onSelectCamera?: (cameraName: string) => void;
};

export default function LiveBirdseyeView({
  supportsFullscreen,
  fullscreen,
  toggleFullscreen,
  onSelectCamera,
}: LiveBirdseyeViewProps) {
  const { t } = useTranslation(["views/live"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const navigate = useNavigate();
  const { isPortrait } = useMobileOrientation();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ width: windowWidth, height: windowHeight }] =
    useResizeObserver(window);

  // pip state

  useEffect(() => {
    setPip(document.pictureInPictureElement != null);
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.pictureInPictureElement]);

  // playback state

  const [pip, setPip] = useState(false);
  const cameraAspectRatio = useMemo(() => {
    if (!config) {
      return 16 / 9;
    }

    return config.birdseye.width / config.birdseye.height;
  }, [config]);

  const windowAspectRatio = useMemo(() => {
    return windowWidth / windowHeight;
  }, [windowWidth, windowHeight]);

  const containerAspectRatio = useMemo(() => {
    if (!containerRef.current) {
      return windowAspectRatio ?? 0;
    }

    return containerRef.current.clientWidth / containerRef.current.clientHeight;
  }, [windowAspectRatio, containerRef]);

  const constrainedAspectRatio = useMemo<number>(() => {
    if (isMobile || fullscreen) {
      return cameraAspectRatio;
    } else {
      return containerAspectRatio < cameraAspectRatio
        ? containerAspectRatio
        : cameraAspectRatio;
    }
  }, [cameraAspectRatio, containerAspectRatio, fullscreen]);

  const growClassName = useMemo(() => {
    if (isMobile) {
      if (isPortrait) {
        return "absolute left-2 right-2 top-[50%] -translate-y-[50%]";
      } else {
        if (cameraAspectRatio > containerAspectRatio) {
          return "absolute left-0 top-[50%] -translate-y-[50%]";
        } else {
          return "absolute top-2 bottom-2 left-[50%] -translate-x-[50%]";
        }
      }
    }

    if (fullscreen) {
      if (cameraAspectRatio > containerAspectRatio) {
        return "absolute inset-x-2 top-[50%] -translate-y-[50%]";
      } else {
        return "absolute inset-y-2 left-[50%] -translate-x-[50%]";
      }
    } else {
      return "absolute top-0 bottom-0 left-[50%] -translate-x-[50%]";
    }
  }, [cameraAspectRatio, containerAspectRatio, fullscreen, isPortrait]);

  const preferredLiveMode = useMemo(() => {
    if (!config || !config.birdseye.restream) {
      return "jsmpeg";
    }

    if (
      isSafari ||
      !("MediaSource" in window || "ManagedMediaSource" in window)
    ) {
      return "webrtc";
    }

    return "mse";
  }, [config]);

  const birdseyeLayout = useBirdseyeLayout();

  // Click overlay handling

  const playerRef = useRef<HTMLDivElement | null>(null);
  const handleOverlayClick = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    ) => {
      let clientX;
      let clientY;
      if ("TouchEvent" in window && e.nativeEvent instanceof TouchEvent) {
        clientX = e.nativeEvent.touches[0].clientX;
        clientY = e.nativeEvent.touches[0].clientY;
      } else if (e.nativeEvent instanceof MouseEvent) {
        clientX = e.nativeEvent.clientX;
        clientY = e.nativeEvent.clientY;
      }

      if (
        playerRef.current &&
        clientX &&
        clientY &&
        config &&
        birdseyeLayout?.payload
      ) {
        const playerRect = playerRef.current.getBoundingClientRect();

        // Calculate coordinates relative to player div, accounting for offset
        const rawX = clientX - playerRect.left;
        const rawY = clientY - playerRect.top;

        // Ensure click is within player bounds
        if (
          rawX < 0 ||
          rawX > playerRect.width ||
          rawY < 0 ||
          rawY > playerRect.height
        ) {
          return;
        }

        // Scale click coordinates to birdseye canvas resolution
        const canvasX = rawX * (config.birdseye.width / playerRect.width);
        const canvasY = rawY * (config.birdseye.height / playerRect.height);

        for (const [cameraName, coords] of Object.entries(
          birdseyeLayout.payload,
        )) {
          const parsedCoords =
            typeof coords === "string" ? JSON.parse(coords) : coords;
          if (
            canvasX >= parsedCoords.x &&
            canvasX < parsedCoords.x + parsedCoords.width &&
            canvasY >= parsedCoords.y &&
            canvasY < parsedCoords.y + parsedCoords.height
          ) {
            onSelectCamera?.(cameraName);
            break;
          }
        }
      }
    },
    [playerRef, config, birdseyeLayout, onSelectCamera],
  );

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
      <div
        ref={mainRef}
        className={
          fullscreen
            ? `fixed inset-0 z-30 bg-black`
            : `flex size-full flex-col p-2 ${isMobile ? "landscape:flex-row" : ""}`
        }
      >
        <div
          className={
            fullscreen
              ? `absolute right-32 top-1 z-40 ${isMobile ? "landscape:bottom-1 landscape:left-2 landscape:right-auto landscape:top-auto" : ""}`
              : `flex h-12 w-full flex-row items-center justify-between ${isMobile ? "landscape:h-full landscape:w-min landscape:flex-col" : ""}`
          }
        >
          {!fullscreen ? (
            <Button
              className={`flex items-center gap-2 rounded-lg ${isMobile ? "ml-2" : "ml-0"}`}
              aria-label={t("label.back", { ns: "common" })}
              size={isMobile ? "icon" : "sm"}
              onClick={() => navigate(-1)}
            >
              <IoMdArrowBack className="size-5" />
              {isDesktop && (
                <div className="text-primary">
                  {t("button.back", { ns: "common" })}
                </div>
              )}
            </Button>
          ) : (
            <div />
          )}
          <TooltipProvider>
            <div
              className={`mr-1 flex flex-row items-center gap-2 *:rounded-lg ${isMobile ? "landscape:flex-col" : ""}`}
            >
              {supportsFullscreen && (
                <CameraFeatureToggle
                  className="p-2 md:p-0"
                  variant={fullscreen ? "overlay" : "primary"}
                  Icon={fullscreen ? FaCompress : FaExpand}
                  isActive={fullscreen}
                  title={
                    fullscreen
                      ? t("button.close", { ns: "common" })
                      : t("button.fullscreen", { ns: "common" })
                  }
                  onClick={toggleFullscreen}
                />
              )}
              {!isIOS && !isFirefox && config.birdseye.restream && (
                <CameraFeatureToggle
                  className="p-2 md:p-0"
                  variant={fullscreen ? "overlay" : "primary"}
                  Icon={LuPictureInPicture}
                  isActive={pip}
                  title={
                    pip
                      ? t("button.close", { ns: "common" })
                      : t("button.pictureInPicture", { ns: "common" })
                  }
                  onClick={() => {
                    if (!pip) {
                      setPip(true);
                    } else {
                      document.exitPictureInPicture();
                      setPip(false);
                    }
                  }}
                />
              )}
            </div>
          </TooltipProvider>
        </div>
        <div id="player-container" className="size-full" ref={containerRef}>
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: "100%",
            }}
            contentStyle={{
              position: "relative",
              width: "100%",
              height: "100%",
            }}
          >
            <div
              className={cn(
                "flex flex-col items-center justify-center",
                growClassName,
              )}
              style={{
                aspectRatio: constrainedAspectRatio,
              }}
              onClick={handleOverlayClick}
            >
              <BirdseyeLivePlayer
                className={`${fullscreen ? "*:rounded-none" : ""}`}
                birdseyeConfig={config.birdseye}
                liveMode={preferredLiveMode}
                containerRef={containerRef}
                playerRef={playerRef}
                pip={pip}
              />
            </div>
          </TransformComponent>
        </div>
      </div>
    </TransformWrapper>
  );
}
