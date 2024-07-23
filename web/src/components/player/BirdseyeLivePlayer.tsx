import WebRtcPlayer from "./WebRTCPlayer";
import { BirdseyeConfig } from "@/types/frigateConfig";
import ActivityIndicator from "../indicators/activity-indicator";
import JSMpegPlayer from "./JSMpegPlayer";
import MSEPlayer from "./MsePlayer";
import { LivePlayerMode } from "@/types/live";
import { cn } from "@/lib/utils";
import React from "react";

type LivePlayerProps = {
  className?: string;
  birdseyeConfig: BirdseyeConfig;
  liveMode: LivePlayerMode;
  pip?: boolean;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  onClick?: () => void;
};

export default function BirdseyeLivePlayer({
  className,
  birdseyeConfig,
  liveMode,
  pip,
  containerRef,
  onClick,
}: LivePlayerProps) {
  let player;
  if (liveMode == "webrtc") {
    player = (
      <WebRtcPlayer
        className={`size-full rounded-lg md:rounded-2xl`}
        camera="birdseye"
        pip={pip}
      />
    );
  } else if (liveMode == "mse") {
    if ("MediaSource" in window || "ManagedMediaSource" in window) {
      player = (
        <MSEPlayer
          className={`size-full rounded-lg md:rounded-2xl`}
          camera="birdseye"
          pip={pip}
        />
      );
    } else {
      player = (
        <div className="w-5xl text-center text-sm">
          iOS 17.1 or greater is required for this live stream type.
        </div>
      );
    }
  } else if (liveMode == "jsmpeg") {
    player = (
      <JSMpegPlayer
        className="flex size-full justify-center overflow-hidden rounded-lg md:rounded-2xl"
        camera="birdseye"
        width={birdseyeConfig.width}
        height={birdseyeConfig.height}
        containerRef={containerRef}
        playbackEnabled={true}
      />
    );
  } else {
    player = <ActivityIndicator />;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex w-full cursor-pointer justify-center",
        className,
      )}
      onClick={onClick}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[30%] w-full rounded-lg bg-gradient-to-b from-black/20 to-transparent md:rounded-2xl"></div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[10%] w-full rounded-lg bg-gradient-to-t from-black/20 to-transparent md:rounded-2xl"></div>
      <div className="size-full">{player}</div>
    </div>
  );
}
