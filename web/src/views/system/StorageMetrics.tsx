import { StorageGraph } from "@/components/graph/SystemGraph";
import { FrigateStats } from "@/types/stats";
import { useMemo } from "react";
import useSWR from "swr";

type CameraStorage = {
  [key: string]: {
    bandwidth: number;
    usage: number;
    usage_percent: number;
  };
};

type StorageMetricsProps = {
  setLastUpdated: (last: number) => void;
};
export default function StorageMetrics({
  setLastUpdated,
}: StorageMetricsProps) {
  const { data: cameraStorage } = useSWR<CameraStorage>("recordings/storage");
  const { data: stats } = useSWR<FrigateStats>("stats");

  const totalStorage = useMemo(() => {
    if (!cameraStorage || !stats) {
      return undefined;
    }

    const totalStorage = {
      used: 0,
      total: stats.service.storage["/media/frigate/recordings"]["total"],
    };

    Object.values(cameraStorage).forEach(
      (cam) => (totalStorage.used += cam.usage),
    );
    setLastUpdated(Date.now() / 1000);
    return totalStorage;
  }, [cameraStorage, stats, setLastUpdated]);

  if (!cameraStorage || !stats || !totalStorage) {
    return;
  }

  return (
    <div className="size-full mt-4 flex flex-col overflow-y-auto">
      <div className="text-muted-foreground text-sm font-medium">
        General Storage
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="p-2.5 bg-secondary dark:bg-primary rounded-2xl flex-col">
          <div className="mb-5">Recordings</div>
          <StorageGraph
            graphId="general-recordings"
            used={totalStorage.used}
            total={totalStorage.total}
          />
        </div>
        <div className="p-2.5 bg-secondary dark:bg-primary rounded-2xl flex-col">
          <div className="mb-5">/tmp/cache</div>
          <StorageGraph
            graphId="general-cache"
            used={stats.service.storage["/tmp/cache"]["used"]}
            total={stats.service.storage["/tmp/cache"]["total"]}
          />
        </div>
        <div className="p-2.5 bg-secondary dark:bg-primary rounded-2xl flex-col">
          <div className="mb-5">/dev/shm</div>
          <StorageGraph
            graphId="general-shared-memory"
            used={stats.service.storage["/dev/shm"]["used"]}
            total={stats.service.storage["/dev/shm"]["total"]}
          />
        </div>
      </div>
      <div className="mt-4 text-muted-foreground text-sm font-medium">
        Camera Storage
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {Object.keys(cameraStorage).map((camera) => (
          <div className="p-2.5 bg-secondary dark:bg-primary rounded-2xl flex-col">
            <div className="mb-5 capitalize">{camera.replaceAll("_", " ")}</div>
            <StorageGraph
              graphId={`${camera}-storage`}
              used={cameraStorage[camera].usage}
              total={totalStorage.used}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
