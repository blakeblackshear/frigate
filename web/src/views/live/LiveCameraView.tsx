import LivePlayer from "@/components/player/LivePlayer";
import { Button } from "@/components/ui/button";
import { CameraConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import { isSafari } from "react-device-detect";
import { IoMdArrowBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";

type LiveCameraViewProps = {
  camera: CameraConfig;
};
export default function LiveCameraView({ camera }: LiveCameraViewProps) {
  const navigate = useNavigate();

  const growClassName = useMemo(() => {
    if (camera.detect.width / camera.detect.height > 2) {
      return "absolute left-2 right-2 top-[50%] -translate-y-[50%]";
    } else {
      return "absolute top-2 bottom-2 left-[50%] -translate-x-[50%]";
    }
  }, [camera]);

  return (
    <div className="size-full flex flex-col">
      <div className="w-full h-12 flex items-center justify-between">
        <Button className="rounded-lg" onClick={() => navigate(-1)}>
          <IoMdArrowBack className="size-5 mr-[10px]" />
          Back
        </Button>
      </div>

      <div className="relative size-full">
        <div
          className={growClassName}
          style={{ aspectRatio: camera.detect.width / camera.detect.height }}
        >
          <LivePlayer
            key={camera.name}
            className="size-full"
            windowVisible
            showStillWithoutActivity={false}
            cameraConfig={camera}
            preferredLiveMode={isSafari ? "webrtc" : "mse"}
          />
        </div>
      </div>
    </div>
  );
}
