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
import { Button } from "@/components/ui/button";
import { AiOutlinePicture } from "react-icons/ai";
import { FaWalking } from "react-icons/fa";
import { LuEar } from "react-icons/lu";
import { TbMovie } from "react-icons/tb";
import MiniEventCard from "@/components/card/MiniEventCard";
import { Event as FrigateEvent } from "@/types/event";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import DynamicCameraImage from "@/components/camera/DynamicCameraImage";

export function Dashboard() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const now = new Date();
  now.setMinutes(now.getMinutes() - 30, 0, 0);
  const recentTimestamp = now.getTime() / 1000;
  const { data: events, mutate: updateEvents } = useSWR<FrigateEvent[]>([
    "events",
    { limit: 10, after: recentTimestamp },
  ]);

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
          {events && events.length > 0 && (
            <>
              <Heading as="h4">Recent Events</Heading>
              <ScrollArea>
                <div className="flex">
                  {events.map((event) => {
                    return (
                      <MiniEventCard
                        key={event.id}
                        event={event}
                        onUpdate={() => updateEvents()}
                      />
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </>
          )}
          <Heading as="h4">Cameras</Heading>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
      <Card>
        <a href={`/live/${camera.name}`}>
          <DynamicCameraImage aspect={16 / 9} camera={camera} />
          <div className="flex justify-between items-center">
            <div className="text-lg capitalize p-2">
              {camera.name.replaceAll("_", " ")}
            </div>
            <div>
              <Button
                variant="ghost"
                size="sm"
                className={`${
                  detectValue == "ON" ? "text-primary" : "text-gray-400"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  sendDetect(detectValue == "ON" ? "OFF" : "ON");
                }}
              >
                <FaWalking />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={
                  camera.record.enabled_in_config
                    ? recordValue == "ON"
                      ? "text-primary"
                      : "text-gray-400"
                    : "text-red-500"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  camera.record.enabled_in_config
                    ? sendRecord(recordValue == "ON" ? "OFF" : "ON")
                    : {};
                }}
              >
                <TbMovie />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`${
                  snapshotValue == "ON" ? "text-primary" : "text-gray-400"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  sendSnapshot(detectValue == "ON" ? "OFF" : "ON");
                }}
              >
                <AiOutlinePicture />
              </Button>
              {camera.audio.enabled_in_config && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${
                    audioValue == "ON" ? "text-primary" : "text-gray-400"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    sendAudio(detectValue == "ON" ? "OFF" : "ON");
                  }}
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
