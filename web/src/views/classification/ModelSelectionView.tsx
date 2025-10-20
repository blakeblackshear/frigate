import { baseUrl } from "@/api/baseUrl";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import useOptimisticState from "@/hooks/use-optimistic-state";
import { cn } from "@/lib/utils";
import {
  CustomClassificationModelConfig,
  FrigateConfig,
} from "@/types/frigateConfig";
import { useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

const allModelTypes = ["objects", "states"] as const;
type ModelType = (typeof allModelTypes)[number];

type ModelSelectionViewProps = {
  onClick: (model: CustomClassificationModelConfig) => void;
};
export default function ModelSelectionView({
  onClick,
}: ModelSelectionViewProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const [page, setPage] = useState<ModelType>("objects");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  // data

  const classificationConfigs = useMemo(() => {
    if (!config) {
      return [];
    }

    const allModels = Object.values(config.classification.custom);

    return allModels.filter((model) => {
      if (pageToggle == "objects" && model.object_config != undefined) {
        return true;
      }

      if (pageToggle == "states" && model.state_config != undefined) {
        return true;
      }

      return false;
    });
  }, [config, pageToggle]);

  if (!config) {
    return <ActivityIndicator />;
  }

  if (classificationConfigs.length == 0) {
    return <div>You need to setup a custom model configuration.</div>;
  }

  return (
    <div className="flex size-full flex-col p-2">
      <div className="flex h-12 w-full items-center">
        <div className="flex flex-row">
          <ToggleGroup
            className="*:rounded-md *:px-3 *:py-4"
            type="single"
            size="sm"
            value={pageToggle}
            onValueChange={(value: ModelType) => {
              if (value) {
                // Restrict viewer navigation
                setPageToggle(value);
              }
            }}
          >
            {allModelTypes.map((item) => (
              <ToggleGroupItem
                key={item}
                className={`flex scroll-mx-10 items-center justify-between gap-2 ${pageToggle == item ? "" : "*:text-muted-foreground"}`}
                value={item}
                data-nav-item={item}
                aria-label={t("selectItem", {
                  ns: "common",
                  item: t("menu." + item),
                })}
              >
                <div className="smart-capitalize">{t("menu." + item)}</div>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
      <div className="flex size-full gap-2 p-2">
        {classificationConfigs.map((config) => (
          <ModelCard
            key={config.name}
            config={config}
            onClick={() => onClick(config)}
          />
        ))}
      </div>
    </div>
  );
}

type ModelCardProps = {
  config: CustomClassificationModelConfig;
  onClick: () => void;
};
function ModelCard({ config, onClick }: ModelCardProps) {
  const { data: dataset } = useSWR<{
    [id: string]: string[];
  }>(`classification/${config.name}/dataset`, { revalidateOnFocus: false });

  const coverImages = useMemo(() => {
    if (!dataset) {
      return {};
    }

    const imageMap: { [key: string]: string } = {};

    for (const [key, imageList] of Object.entries(dataset)) {
      if (imageList.length > 0) {
        imageMap[key] = imageList[0];
      }
    }

    return imageMap;
  }, [dataset]);

  return (
    <div
      key={config.name}
      className={cn(
        "flex h-60 cursor-pointer flex-col items-center gap-2 rounded-lg bg-card p-2 outline outline-[3px]",
        "outline-transparent duration-500",
        isMobile && "w-full",
      )}
      onClick={() => onClick()}
    >
      <div
        className={cn("grid size-48 grid-cols-2 gap-2", isMobile && "w-full")}
      >
        {Object.entries(coverImages).map(([key, image]) => (
          <img
            key={key}
            className=""
            src={`${baseUrl}clips/${config.name}/dataset/${key}/${image}`}
          />
        ))}
      </div>
      <div className="smart-capitalize">{config.name}</div>
    </div>
  );
}
