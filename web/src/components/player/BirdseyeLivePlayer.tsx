import WebRtcPlayer from "./WebRTCPlayer";
import { BirdseyeConfig } from "@/types/frigateConfig";
import ActivityIndicator from "../ui/activity-indicator";
import JSMpegPlayer from "./JSMpegPlayer";

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
    return <div className="max-w-5xl">Not yet implemented</div>;
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
