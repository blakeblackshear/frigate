import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";
import {
  CustomClassificationModelConfig,
  FrigateConfig,
} from "@/types/frigateConfig";
import { useMemo } from "react";
import { isMobile } from "react-device-detect";
import useSWR from "swr";

type ModelSelectionViewProps = {
  onClick: (model: CustomClassificationModelConfig) => void;
};
export default function ModelSelectionView({
  onClick,
}: ModelSelectionViewProps) {
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
    <div className="flex size-full gap-2 p-2">
      {classificationConfigs.map((config) => (
        <ModelCard config={config} onClick={() => onClick(config)} />
      ))}
    </div>
  );
}

type ModelCardProps = {
  config: CustomClassificationModelConfig;
  onClick: () => void;
};
function ModelCard({ config, onClick }: ModelCardProps) {
  return (
    <div
      key={config.name}
      className={cn(
        "flex h-52 cursor-pointer flex-col gap-2 rounded-lg bg-card p-2 outline outline-[3px]",
        "outline-transparent duration-500",
        isMobile && "w-full",
      )}
      onClick={() => onClick()}
      onContextMenu={() => {
        // e.stopPropagation();
        // e.preventDefault();
        // handleClickEvent(true);
      }}
    >
      <div className="size-48"></div>
      <div className="smart-capitalize">
        {config.name} ({config.state_config != null ? "State" : "Object"}{" "}
        Classification)
      </div>
    </div>
  );
}
