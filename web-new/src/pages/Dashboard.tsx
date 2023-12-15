import { useMemo } from "react";
import ActivityIndicator from "@/components/ui/activity-indicator";
import {
  useAudioState,
  useDetectState,
  useRecordingsState,
  useSnapshotsState,
} from "@/api/ws";
import useSWR from "swr";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import Heading from "@/components/ui/heading";
import { Card } from "@/components/ui/card";
import CameraImage from "@/components/camera/CameraImage";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { AiOutlinePicture } from "react-icons/ai";
import { FaWalking } from "react-icons/fa";
import { LuEar } from "react-icons/lu";
import { TbMovie } from "react-icons/tb";

export function Dashboard() {
  const { data: config } = useSWR<FrigateConfig>("config");

  const sortedCameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  return (
    <>
      <Heading as="h2">Dashboard</Heading>

      {!config && <ActivityIndicator />}

      {config && (
        <div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sortedCameras.map((camera) => {
              return <Camera key={camera.name} camera={camera} />;
            })}
          </div>
        </div>
      )}
    </>
  );
}

function Camera({ camera }: { camera: CameraConfig }) {
  const { payload: detectValue, send: sendDetect } = useDetectState(
    camera.name
  );
  const { payload: recordValue, send: sendRecord } = useRecordingsState(
    camera.name
  );
  const { payload: snapshotValue, send: sendSnapshot } = useSnapshotsState(
    camera.name
  );
  const { payload: audioValue, send: sendAudio } = useAudioState(camera.name);

  return (
    <>
      <Card className="">
        <a href={`/live/${camera.name}`}>
          <AspectRatio
            ratio={16 / 9}
            className="bg-black flex justify-center items-center"
          >
            <CameraImage camera={camera.name} fitAspect={16 / 9} />
          </AspectRatio>
          <div className="flex justify-between items-center">
            <Heading className="capitalize p-2" as="h4">
              {camera.name.replaceAll("_", " ")}
            </Heading>
            <div>
              <Button
                variant="ghost"
                className={`${
                  detectValue == "ON" ? "text-primary" : "text-gray-400"
                }`}
                onClick={() => sendDetect(detectValue == "ON" ? "OFF" : "ON")}
              >
                <FaWalking />
              </Button>
              <Button
                variant="ghost"
                className={
                  camera.record.enabled_in_config
                    ? recordValue == "ON"
                      ? "text-primary"
                      : "text-gray-400"
                    : "text-red-500"
                }
                onClick={() =>
                  camera.record.enabled_in_config
                    ? sendRecord(recordValue == "ON" ? "OFF" : "ON")
                    : {}
                }
              >
                <TbMovie />
              </Button>
              <Button
                variant="ghost"
                className={`${
                  snapshotValue == "ON" ? "text-primary" : "text-gray-400"
                }`}
                onClick={() => sendSnapshot(detectValue == "ON" ? "OFF" : "ON")}
              >
                <AiOutlinePicture />
              </Button>
              {camera.audio.enabled_in_config && (
                <Button
                  variant="ghost"
                  className={`${
                    audioValue == "ON" ? "text-primary" : "text-gray-400"
                  }`}
                  onClick={() => sendAudio(detectValue == "ON" ? "OFF" : "ON")}
                >
                  <LuEar />
                </Button>
              )}
            </div>
          </div>
        </a>
      </Card>
    </>
  );
}

export default Dashboard;
