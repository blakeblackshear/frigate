import React, { useState, useRef, useEffect } from "react";
import { useVideoDimensions } from "@/hooks/use-video-dimensions";
import HlsVideoPlayer from "./HlsVideoPlayer";
import ActivityIndicator from "../indicators/activity-indicator";

type GenericVideoPlayerProps = {
  source: string;
  onPlaying?: () => void;
  children?: React.ReactNode;
};

export function GenericVideoPlayer({
  source,
  onPlaying,
  children,
}: GenericVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [sourceExists, setSourceExists] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { videoDimensions, setVideoResolution } =
    useVideoDimensions(containerRef);

  useEffect(() => {
    const checkSourceExists = async (url: string) => {
      try {
        const response = await fetch(url, { method: "HEAD" });
        // nginx vod module returns 502 for non existent media
        // https://github.com/kaltura/nginx-vod-module/issues/468
        setSourceExists(response.status !== 502 && response.status !== 404);
      } catch (error) {
        setSourceExists(false);
      }
    };

    checkSourceExists(source);
  }, [source]);

  return (
    <div ref={containerRef} className="relative flex h-full w-full flex-col">
      <div className="relative flex flex-grow items-center justify-center">
        {!sourceExists ? (
          <div className="flex aspect-video w-full items-center justify-center bg-background_alt text-lg text-primary">
            Video not available
          </div>
        ) : (
          <>
            {isLoading && (
              <ActivityIndicator className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" />
            )}
            <div
              className="relative flex items-center justify-center"
              style={videoDimensions}
            >
              <HlsVideoPlayer
                videoRef={videoRef}
                currentSource={source}
                hotKeys
                visible
                frigateControls={false}
                fullscreen={false}
                supportsFullscreen={false}
                onPlaying={() => {
                  setIsLoading(false);
                  onPlaying?.();
                }}
                setFullResolution={setVideoResolution}
              />
              {!isLoading && children}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
