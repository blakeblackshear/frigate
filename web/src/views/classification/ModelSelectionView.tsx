import ActivityIndicator from "@/components/indicators/activity-indicator";
import { FrigateConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import useSWR from "swr";

export default function ModelSelectionView() {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const classificationConfigs = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.classification.custom);
  }, [config]);

  if (!config) {
    return <ActivityIndicator />;
  }

  if (classificationConfigs.length == 0) {
    return <div>You need to setup a custom model configuration.</div>;
  }

  return (
    <div className="size-full">
      {classificationConfigs.map((config) => (
        <div className="size-48">{config.name}</div>
      ))}
    </div>
  );
}
