import { StorageGraph } from "@/components/graph/SystemGraph";
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
  lastUpdated: number;
  setLastUpdated: (last: number) => void;
};
export default function StorageMetrics({
  lastUpdated,
  setLastUpdated,
}: StorageMetricsProps) {
  const { data: storage } = useSWR<CameraStorage>("recordings/storage");

  const totalStorage = useMemo(() => {
    if (!storage) {
      return undefined;
    }

    const totalStorage = {
      total: 0,
    };

    Object.values(storage).forEach((cam) => (totalStorage.total += cam.usage));

    return totalStorage;
  }, [storage]);

  if (!totalStorage) {
    return;
  }

  return (
    <div className="size-full mt-4 flex flex-col overflow-y-auto">
      <div className="text-muted-foreground text-sm font-medium">
        General Storage
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="p-2.5 bg-primary rounded-2xl flex-col">
          <div className="mb-5">Recordings</div>
          <StorageGraph
            graphId="general-recordings"
            used={1000000}
            total={5000000}
            data={[{ name: "Recordings", data: [{ x: "Recordings", y: 25 }] }]}
          />
        </div>
      </div>
    </div>
  );
}
