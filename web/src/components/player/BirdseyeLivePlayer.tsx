import WebRtcPlayer from "./WebRTCPlayer";
import { BirdseyeConfig } from "@/types/frigateConfig";
import ActivityIndicator from "../indicators/activity-indicator";
import JSMpegPlayer from "./JSMpegPlayer";
import MSEPlayer from "./MsePlayer";
import { LivePlayerMode } from "@/types/live";

type LivePlayerProps = {
  className?: string;
  birdseyeConfig: BirdseyeConfig;
  liveMode: LivePlayerMode;
  onClick?: () => void;
};

export default function BirdseyeLivePlayer({
  className,
  birdseyeConfig,
  liveMode,
  onClick,
}: LivePlayerProps) {
  let player;
  if (liveMode == "webrtc") {
    player = (
      <WebRtcPlayer className={`rounded-2xl size-full`} camera="birdseye" />
    );
  } else if (liveMode == "mse") {
    if ("MediaSource" in window || "ManagedMediaSource" in window) {
      player = (
        <MSEPlayer className={`rounded-2xl size-full`} camera="birdseye" />
      );
    } else {
      player = (
        <div className="w-5xl text-center text-sm">
          MSE is only supported on iOS 17.1+. You'll need to update if available
          or use jsmpeg / webRTC streams. See the docs for more info.
        </div>
      );
    }
  } else if (liveMode == "jsmpeg") {
    player = (
      <JSMpegPlayer
        className="size-full flex justify-center rounded-2xl overflow-hidden"
        camera="birdseye"
        width={birdseyeConfig.width}
        height={birdseyeConfig.height}
      />
    );
  } else {
    player = <ActivityIndicator />;
  }

  return (
    <div
      className={`relative flex justify-center w-full cursor-pointer ${className ?? ""}`}
      onClick={onClick}
    >
      <div className="absolute top-0 inset-x-0 rounded-2xl z-10 w-full h-[30%] bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 inset-x-0 rounded-2xl z-10 w-full h-[10%] bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
      <div className="size-full">{player}</div>
    </div>
  );
}
