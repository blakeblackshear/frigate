import WebRtcPlayer from "./WebRTCPlayer";
import { BirdseyeConfig } from "@/types/frigateConfig";
import ActivityIndicator from "../indicators/activity-indicator";
import JSMpegPlayer from "./JSMpegPlayer";
import MSEPlayer from "./MsePlayer";

type LivePlayerProps = {
  birdseyeConfig: BirdseyeConfig;
  liveMode: string;
};

export default function BirdseyeLivePlayer({
  birdseyeConfig,
  liveMode,
}: LivePlayerProps) {
  if (liveMode == "webrtc") {
    return (
      <div className="max-w-5xl">
        <WebRtcPlayer camera="birdseye" />
      </div>
    );
  } else if (liveMode == "mse") {
    if ("MediaSource" in window || "ManagedMediaSource" in window) {
      return (
        <div className="max-w-5xl">
          <MSEPlayer camera="birdseye" />
        </div>
      );
    } else {
      return (
        <div className="w-5xl text-center text-sm">
          MSE is only supported on iOS 17.1+. You'll need to update if available
          or use jsmpeg / webRTC streams. See the docs for more info.
        </div>
      );
    }
  } else if (liveMode == "jsmpeg") {
    return (
      <div className={`max-w-[${birdseyeConfig.width}px]`}>
        <JSMpegPlayer
          camera="birdseye"
          width={birdseyeConfig.width}
          height={birdseyeConfig.height}
        />
      </div>
    );
  } else {
    <ActivityIndicator />;
  }
}
