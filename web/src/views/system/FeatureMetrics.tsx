import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useEffect, useMemo, useState } from "react";
import { useFrigateStats } from "@/api/ws";
import { EmbeddingThreshold } from "@/types/graph";
import { Skeleton } from "@/components/ui/skeleton";
import { ThresholdBarGraph } from "@/components/graph/SystemGraph";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type FeatureMetricsProps = {
  lastUpdated: number;
  setLastUpdated: (last: number) => void;
};
export default function FeatureMetrics({
  lastUpdated,
  setLastUpdated,
}: FeatureMetricsProps) {
  // stats
  const { t } = useTranslation(["views/system"]);

  const { data: initialStats } = useSWR<FrigateStats[]>(
    ["stats/history", { keys: "embeddings,service" }],
    {
      revalidateOnFocus: false,
    },
  );

  const [statsHistory, setStatsHistory] = useState<FrigateStats[]>([]);
  const updatedStats = useFrigateStats();

  useEffect(() => {
    if (initialStats == undefined || initialStats.length == 0) {
      return;
    }

    if (statsHistory.length == 0) {
      setStatsHistory(initialStats);
      return;
    }

    if (!updatedStats) {
      return;
    }

    if (updatedStats.service.last_updated > lastUpdated) {
      setStatsHistory([...statsHistory.slice(1), updatedStats]);
      setLastUpdated(Date.now() / 1000);
    }
  }, [initialStats, updatedStats, statsHistory, lastUpdated, setLastUpdated]);

  // timestamps

  const updateTimes = useMemo(
    () => statsHistory.map((stats) => stats.service.last_updated),
    [statsHistory],
  );

  // features stats

  const embeddingInferenceTimeSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: number }[] };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats?.embeddings) {
        return;
      }

      Object.entries(stats.embeddings).forEach(([rawKey, stat]) => {
        const key = rawKey.replaceAll("_", " ");

        if (!(key in series)) {
          series[key] = { name: t("features.embeddings." + rawKey), data: [] };
        }

        series[key].data.push({ x: statsIdx + 1, y: stat });
      });
    });
    return Object.values(series);
  }, [statsHistory, t]);

  return (
    <>
      <div className="scrollbar-container mt-4 flex size-full flex-col overflow-y-auto">
        <div className="text-sm font-medium text-muted-foreground">
          {t("features.title")}
        </div>
        <div
          className={cn(
            "mt-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-3",
            embeddingInferenceTimeSeries && "sm:grid-cols-4",
          )}
        >
          {statsHistory.length != 0 ? (
            <>
              {embeddingInferenceTimeSeries.map((series) => (
                <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                  <div className="mb-5 capitalize">{series.name}</div>
                  <ThresholdBarGraph
                    key={series.name}
                    graphId={`${series.name}-inference`}
                    name={series.name}
                    unit="ms"
                    threshold={EmbeddingThreshold}
                    updateTimes={updateTimes}
                    data={[series]}
                  />
                </div>
              ))}
            </>
          ) : (
            <Skeleton className="aspect-video w-full rounded-lg md:rounded-2xl" />
          )}
        </div>
      </div>
    </>
  );
}
