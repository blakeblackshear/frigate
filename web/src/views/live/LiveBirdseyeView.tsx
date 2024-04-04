import CameraFeatureToggle from "@/components/dynamic/CameraFeatureToggle";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import BirdseyeLivePlayer from "@/components/player/BirdseyeLivePlayer";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useResizeObserver } from "@/hooks/resize-observer";
import { FrigateConfig } from "@/types/frigateConfig";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [{ width: windowWidth, height: windowHeight }] =
    useResizeObserver(window);

  // fullscreen state

  useEffect(() => {
    if (mainRef.current == null) {
      return;
    }

    const listener = () => {
      setFullscreen(document.fullscreenElement != null);
    };
    document.addEventListener("fullscreenchange", listener);

    return () => {
      document.removeEventListener("fullscreenchange", listener);
    };
  }, [mainRef]);

  // playback state

  const [fullscreen, setFullscreen] = useState(false);

  const cameraAspectRatio = useMemo(() => {
    if (!config) {
      return 16 / 9;
    }

    return config.birdseye.width / config.birdseye.height;
  }, [config]);

  const growClassName = useMemo(() => {
    if (isMobile) {
      if (isPortrait) {
        return "absolute left-2 right-2 top-[50%] -translate-y-[50%]";
      } else {
        if (cameraAspectRatio > 16 / 9) {
          return "absolute left-0 top-[50%] -translate-y-[50%]";
        } else {
          return "absolute top-2 bottom-2 left-[50%] -translate-x-[50%]";
        }
      }
    }

    if (fullscreen) {
      if (cameraAspectRatio > 16 / 9) {
        return "absolute inset-x-2 top-[50%] -translate-y-[50%]";
      } else {
        return "absolute inset-y-2 left-[50%] -translate-x-[50%]";
      }
    } else {
      return "absolute top-2 bottom-2 left-[50%] -translate-x-[50%]";
    }
  }, [cameraAspectRatio, fullscreen, isPortrait]);

  const preferredLiveMode = useMemo(() => {
    if (!config || !config.birdseye.restream) {
      return "jsmpeg";
    }

    if (isSafari) {
      return "webrtc";
    }

    return "mse";
  }, [config]);

  const windowAspectRatio = useMemo(() => {
    return windowWidth / windowHeight;
  }, [windowWidth, windowHeight]);

  const aspectRatio = useMemo<number>(() => {
    if (isMobile || fullscreen) {
      return cameraAspectRatio;
    } else {
      return windowAspectRatio < cameraAspectRatio
        ? windowAspectRatio - 0.05
        : cameraAspectRatio - 0.03;
    }
  }, [cameraAspectRatio, windowAspectRatio, fullscreen]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <TransformWrapper minScale={1.0}>
      <div
        ref={mainRef}
        className={
          fullscreen
            ? `fixed inset-0 bg-black z-30`
            : `size-full p-2 flex flex-col ${isMobile ? "landscape:flex-row" : ""}`
        }
      >
        <div
          className={
            fullscreen
              ? `absolute right-32 top-1 z-40 ${isMobile ? "landscape:left-2 landscape:right-auto landscape:bottom-1 landscape:top-auto" : ""}`
              : `w-full h-12 flex flex-row items-center justify-between ${isMobile ? "landscape:w-min landscape:h-full landscape:flex-col" : ""}`
          }
        >
          {!fullscreen ? (
            <Button
              className={`rounded-lg flex items-center gap-2 ${isMobile ? "ml-2" : "ml-0"}`}
              size={isMobile ? "icon" : "sm"}
              onClick={() => navigate(-1)}
            >
              <IoMdArrowBack className="size-5" />
              {isDesktop && <div className="text-primary-foreground">Back</div>}
            </Button>
          ) : (
            <div />
          )}
          <TooltipProvider>
            <div
              className={`flex flex-row items-center gap-2 mr-1 *:rounded-lg ${isMobile ? "landscape:flex-col" : ""}`}
            >
              <CameraFeatureToggle
                className="p-2 md:p-0"
                variant={fullscreen ? "overlay" : "primary"}
                Icon={fullscreen ? FaCompress : FaExpand}
                isActive={fullscreen}
                title={fullscreen ? "Close" : "Fullscreen"}
                onClick={() => {
                  if (fullscreen) {
                    document.exitFullscreen();
                  } else {
                    mainRef.current?.requestFullscreen();
                  }
                }}
              />
            </div>
          </TooltipProvider>
        </div>
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
              aspectRatio: aspectRatio,
            }}
          >
            <BirdseyeLivePlayer
              className="h-full"
              birdseyeConfig={config.birdseye}
              liveMode={preferredLiveMode}
            />
          </div>
        </TransformComponent>
      </div>
    </TransformWrapper>
  );
}
