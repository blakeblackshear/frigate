import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFrigateStats } from "@/api/ws";
import { EmbeddingThreshold, GenAIThreshold, Threshold } from "@/types/graph";
import { Skeleton } from "@/components/ui/skeleton";
import { ThresholdBarGraph } from "@/components/graph/SystemGraph";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { EventsPerSecondsLineGraph } from "@/components/graph/LineGraph";

type EnrichmentMetricsProps = {
  lastUpdated: number;
  setLastUpdated: (last: number) => void;
};
export default function EnrichmentMetrics({
  lastUpdated,
  setLastUpdated,
}: EnrichmentMetricsProps) {
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

  const getThreshold = useCallback((key: string) => {
    if (key.includes("description")) {
      return GenAIThreshold;
    }

    return EmbeddingThreshold;
  }, []);

  // timestamps

  const updateTimes = useMemo(
    () => statsHistory.map((stats) => stats.service.last_updated),
    [statsHistory],
  );

  // features stats

  const groupedEnrichmentMetrics = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: {
        rawKey: string;
        name: string;
        metrics: Threshold;
        data: { x: number; y: number }[];
      };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats?.embeddings) {
        return;
      }

      Object.entries(stats.embeddings).forEach(([rawKey, stat]) => {
        const key = rawKey.replaceAll("_", " ");
        if (!(key in series)) {
          const classificationIndex = rawKey.indexOf("_classification_");
          const seriesName =
            classificationIndex === -1
              ? t("enrichments.embeddings." + rawKey)
              : t(
                  `enrichments.embeddings.${rawKey.substring(classificationIndex + 1)}`,
                  {
                    name: rawKey.substring(0, classificationIndex),
                  },
                );
          series[key] = {
            rawKey,
            name: seriesName,
            metrics: getThreshold(rawKey),
            data: [],
          };
        }

        series[key].data.push({ x: statsIdx + 1, y: stat });
      });
    });

    // Group series by category (extract base name from raw key)
    const grouped: {
      [category: string]: {
        categoryName: string;
        speedSeries?: {
          name: string;
          metrics: Threshold;
          data: { x: number; y: number }[];
        };
        eventsSeries?: {
          name: string;
          metrics: Threshold;
          data: { x: number; y: number }[];
        };
      };
    } = {};

    Object.values(series).forEach((s) => {
      // Extract base category name from raw key
      // All metrics follow the pattern: {base}_speed and {base}_events_per_second
      let categoryKey = s.rawKey;
      let isSpeed = false;

      if (s.rawKey.endsWith("_speed")) {
        categoryKey = s.rawKey.replace("_speed", "");
        isSpeed = true;
      } else if (s.rawKey.endsWith("_events_per_second")) {
        categoryKey = s.rawKey.replace("_events_per_second", "");
        isSpeed = false;
      }

      let categoryName = "";
      // Get translated category name
      if (categoryKey.endsWith("_classification")) {
        const name = categoryKey.replace("_classification", "");
        categoryName = t("enrichments.embeddings.classification", { name });
      } else {
        categoryName = t("enrichments.embeddings." + categoryKey);
      }

      if (!(categoryKey in grouped)) {
        grouped[categoryKey] = {
          categoryName,
          speedSeries: undefined,
          eventsSeries: undefined,
        };
      }

      if (isSpeed) {
        grouped[categoryKey].speedSeries = s;
      } else {
        grouped[categoryKey].eventsSeries = s;
      }
    });

    return Object.values(grouped);
  }, [statsHistory, t, getThreshold]);

  return (
    <>
      <div className="scrollbar-container mt-4 flex size-full flex-col overflow-y-auto">
        <div className="text-sm font-medium text-muted-foreground">
          {t("enrichments.title")}
        </div>
        <div
          className={cn(
            "mt-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4",
          )}
        >
          {statsHistory.length != 0 ? (
            <>
              {groupedEnrichmentMetrics.map((group) => (
                <div
                  key={group.categoryName}
                  className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl"
                >
                  <div className="mb-5 smart-capitalize">
                    {group.categoryName}
                  </div>
                  <div className="space-y-4">
                    {group.speedSeries && (
                      <ThresholdBarGraph
                        key={`${group.categoryName}-speed`}
                        graphId={`${group.categoryName}-inference`}
                        name={t("enrichments.averageInf")}
                        unit="ms"
                        threshold={group.speedSeries.metrics}
                        updateTimes={updateTimes}
                        data={[group.speedSeries]}
                      />
                    )}
                    {group.eventsSeries && (
                      <EventsPerSecondsLineGraph
                        key={`${group.categoryName}-events`}
                        graphId={`${group.categoryName}-fps`}
                        unit=""
                        name={t("enrichments.infPerSecond")}
                        updateTimes={updateTimes}
                        data={[group.eventsSeries]}
                      />
                    )}
                  </div>
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
