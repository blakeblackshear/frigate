import { cn } from "@/lib/utils";
import { PlayerStatsType } from "@/types/live";

type PlayerStatsProps = {
  stats: PlayerStatsType;
  minimal: boolean;
};

export function PlayerStats({ stats, minimal }: PlayerStatsProps) {
  const fullStatsContent = (
    <>
      <p>
        <span className="text-white/70">Stream Type:</span>{" "}
        <span className="text-white">{stats.streamType}</span>
      </p>
      <p>
        <span className="text-white/70">Bandwidth:</span>{" "}
        <span className="text-white">{stats.bandwidth.toFixed(2)} kbps</span>
      </p>
      {stats.latency != undefined && (
        <p>
          <span className="text-white/70">Latency:</span>{" "}
          <span
            className={`text-white ${stats.latency > 2 ? "text-danger" : ""}`}
          >
            {stats.latency.toFixed(2)} seconds
          </span>
        </p>
      )}
      <p>
        <span className="text-white/70">Total Frames:</span>{" "}
        <span className="text-white">{stats.totalFrames}</span>
      </p>
      {stats.droppedFrames != undefined && (
        <p>
          <span className="text-white/70">Dropped Frames:</span>{" "}
          <span className="text-white">{stats.droppedFrames}</span>
        </p>
      )}
      {stats.decodedFrames != undefined && (
        <p>
          <span className="text-white/70">Decoded Frames:</span>{" "}
          <span className="text-white">{stats.decodedFrames}</span>
        </p>
      )}
      {stats.droppedFrameRate != undefined && (
        <p>
          <span className="text-white/70">Dropped Frame Rate:</span>{" "}
          <span className="text-white">
            {stats.droppedFrameRate.toFixed(2)}%
          </span>
        </p>
      )}
    </>
  );

  const minimalStatsContent = (
    <div className="flex flex-row items-center justify-center gap-4">
      <div className="flex flex-col items-center justify-start gap-1">
        <span className="text-white/70">Type</span>
        <span className="text-white">{stats.streamType}</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-white/70">Bandwidth</span>{" "}
        <span className="text-white">{stats.bandwidth.toFixed(2)} kbps</span>
      </div>
      {stats.latency != undefined && (
        <div className="hidden flex-col items-center gap-1 md:flex">
          <span className="text-white/70">Latency</span>
          <span
            className={`text-white ${stats.latency >= 2 ? "text-danger" : ""}`}
          >
            {stats.latency.toFixed(2)} sec
          </span>
        </div>
      )}
      {stats.droppedFrames != undefined && (
        <div className="flex flex-col items-center justify-end gap-1">
          <span className="text-white/70">Dropped</span>
          <span className="text-white">{stats.droppedFrames} frames</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div
        className={cn(
          minimal
            ? "absolute bottom-0 left-0 max-h-[50%] w-full overflow-y-auto rounded-b-lg p-1 md:rounded-b-xl md:p-3"
            : "absolute bottom-2 right-2 min-w-52 rounded-2xl p-4",
          "z-50 flex flex-col gap-1 bg-black/70 text-[9px] duration-300 animate-in fade-in md:text-xs",
        )}
      >
        {minimal ? minimalStatsContent : fullStatsContent}
      </div>
    </>
  );
}
