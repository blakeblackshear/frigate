import { baseUrl } from "@/api/baseUrl";
import ActivityIndicator from "../indicators/activity-indicator";
import { LuTrash } from "react-icons/lu";
import { Button } from "../ui/button";
import { useMemo, useRef, useState } from "react";
import { isDesktop } from "react-device-detect";
import { FaPlay } from "react-icons/fa";
import Chip from "../indicators/Chip";

type ExportProps = {
  file: {
    name: string;
  };
  onDelete: (file: string) => void;
};

export default function ExportCard({ file, onDelete }: ExportProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [playing, setPlaying] = useState(false);
  const inProgress = useMemo(
    () => file.name.startsWith("in_progress"),
    [file.name],
  );

  return (
    <div
      className="relative aspect-video bg-black rounded-2xl flex justify-center items-center"
      onMouseEnter={
        isDesktop && !inProgress ? () => setHovered(true) : undefined
      }
      onMouseLeave={
        isDesktop && !inProgress ? () => setHovered(false) : undefined
      }
      onClick={isDesktop || inProgress ? undefined : () => setHovered(!hovered)}
    >
      {!playing && hovered && (
        <>
          <div className="absolute inset-0 z-10 bg-black bg-opacity-60 rounded-2xl" />
          <Chip
            className="absolute top-2 right-2 bg-gradient-to-br from-gray-400 to-gray-500 bg-gray-500 rounded-md cursor-pointer"
            onClick={() => onDelete(file.name)}
          >
            <LuTrash className="w-4 h-4 text-destructive fill-destructive" />
          </Chip>
          <Button
            className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-20 h-20 z-20 text-white hover:text-white hover:bg-transparent"
            variant="ghost"
            onClick={() => {
              setPlaying(true);
              videoRef.current?.play();
            }}
          >
            <FaPlay />
          </Button>
        </>
      )}
      {inProgress ? (
        <ActivityIndicator />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 aspect-video rounded-2xl"
          playsInline
          preload="auto"
          muted
          controls={playing}
        >
          <source src={`${baseUrl}exports/${file.name}`} type="video/mp4" />
        </video>
      )}
      {!playing && (
        <div className="absolute bottom-0 inset-x-0 rounded-b-l z-10 h-[20%] bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-2xl">
          <div className="flex h-full justify-between items-end mx-3 pb-1 text-white text-sm capitalize">
            {file.name.substring(0, file.name.length - 4).replaceAll("_", " ")}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 *             <Button variant="secondary" onClick={() => onSelect(file.name)}>
            <LuPlay className="h-4 w-4 text-green-600" />
          </Button>
          <a
            className="text-blue-500 hover:underline overflow-hidden"
            href={`${baseUrl}exports/${file.name}`}
            download
          >
            {file.name.substring(0, file.name.length - 4)}
          </a>
          <Button
            className="ml-auto"
            variant="secondary"
            onClick={() => onDelete(file.name)}
          >
            <LuTrash className="h-4 w-4" stroke="#f87171" />
          </Button>
 */
