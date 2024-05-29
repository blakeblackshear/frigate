import CameraFeatureToggle from "@/components/dynamic/CameraFeatureToggle";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import BirdseyeLivePlayer from "@/components/player/BirdseyeLivePlayer";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useResizeObserver } from "@/hooks/resize-observer";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { FrigateConfig } from "@/types/frigateConfig";
import { useMemo, useRef } from "react";
import {
  isDesktop,
  isMobile,
  isSafari,
  useMobileOrientation,
} from "react-device-detect";
import { FaCompress, FaExpand } from "react-icons/fa";
import { IoMdArrowBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import useSWR from "swr";

export default function LiveBirdseyeView() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const navigate = useNavigate();
  const { isPortrait } = useMobileOrientation();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ width: windowWidth, height: windowHeight }] =
    useResizeObserver(window);

  // fullscreen state

  const { fullscreen, toggleFullscreen } = useFullscreen(mainRef);

  // playback state

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

    if (isSafari) {
      return "webrtc";
    }

    return "mse";
  }, [config]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <TransformWrapper minScale={1.0}>
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
              size={isMobile ? "icon" : "sm"}
              onClick={() => navigate(-1)}
            >
              <IoMdArrowBack className="size-5" />
              {isDesktop && <div className="text-primary">Back</div>}
            </Button>
          ) : (
            <div />
          )}
          <TooltipProvider>
            <div
              className={`mr-1 flex flex-row items-center gap-2 *:rounded-lg ${isMobile ? "landscape:flex-col" : ""}`}
            >
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={fullscreen ? FaCompress : FaExpand}
                isActive={fullscreen}
                title={fullscreen ? "Close" : "Fullscreen"}
                onClick={toggleFullscreen}
              />
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
              className={growClassName}
              style={{
                aspectRatio: constrainedAspectRatio,
              }}
            >
              <BirdseyeLivePlayer
                className={`${fullscreen ? "*:rounded-none" : ""}`}
                birdseyeConfig={config.birdseye}
                liveMode={preferredLiveMode}
                containerRef={containerRef}
              />
            </div>
          </TransformComponent>
        </div>
      </div>
    </TransformWrapper>
  );
}
