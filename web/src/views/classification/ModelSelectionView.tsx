import { baseUrl } from "@/api/baseUrl";
import ClassificationModelWizardDialog from "@/components/classification/ClassificationModelWizardDialog";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { ImageShadowOverlay } from "@/components/overlay/ImageShadowOverlay";
import { Button } from "@/components/ui/button";
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
import { FaFolderPlus } from "react-icons/fa";
import { MdModelTraining } from "react-icons/md";
import useSWR from "swr";
import Heading from "@/components/ui/heading";

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

    return Object.values(config.classification.custom);
  }, [config]);

  const selectedClassificationConfigs = useMemo(() => {
    return classificationConfigs.filter((model) => {
      if (pageToggle == "objects" && model.object_config != undefined) {
        return true;
      }

      if (pageToggle == "states" && model.state_config != undefined) {
        return true;
      }

      return false;
    });
  }, [classificationConfigs, pageToggle]);

  // new model wizard

  const [newModel, setNewModel] = useState(false);

  if (!config) {
    return <ActivityIndicator />;
  }

  if (classificationConfigs.length == 0) {
    return <NoModelsView onCreateModel={() => setNewModel(true)} />;
  }

  return (
    <div className="flex size-full flex-col p-2">
      <ClassificationModelWizardDialog
        open={newModel}
        onClose={() => setNewModel(false)}
      />

      <div className="flex h-12 w-full items-center justify-between">
        <div className="flex flex-row items-center">
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
        <div className="flex flex-row items-center">
          <Button
            className="flex flex-row items-center gap-2"
            variant="select"
            onClick={() => setNewModel(true)}
          >
            <FaFolderPlus />
            Add Classification
          </Button>
        </div>
      </div>
      <div className="flex size-full gap-2 p-2">
        {selectedClassificationConfigs.map((config) => (
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

function NoModelsView({ onCreateModel }: { onCreateModel: () => void }) {
  const { t } = useTranslation(["views/classificationModel"]);

  return (
    <div className="flex size-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <MdModelTraining className="size-8" />
        <Heading as="h4">{t("noModels.title")}</Heading>
        <div className="mb-3 text-center text-secondary-foreground">
          {t("noModels.description")}
        </div>
        <Button size="sm" variant="select" onClick={onCreateModel}>
          {t("noModels.buttonText")}
        </Button>
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

  const coverImage = useMemo(() => {
    if (!dataset) {
      return undefined;
    }

    const keys = Object.keys(dataset).filter((key) => key != "none");
    const selectedKey = keys[0];

    if (!dataset[selectedKey]) {
      return undefined;
    }

    return {
      name: selectedKey,
      img: dataset[selectedKey][0],
    };
  }, [dataset]);

  return (
    <div
      key={config.name}
      className={cn(
        "relative size-60 cursor-pointer overflow-hidden rounded-lg",
        "outline-transparent duration-500",
        isMobile && "w-full",
      )}
      onClick={() => onClick()}
    >
      <img
        className={cn("size-full", isMobile && "w-full")}
        src={`${baseUrl}clips/${config.name}/dataset/${coverImage?.name}/${coverImage?.img}`}
      />
      <ImageShadowOverlay />
      <div className="absolute bottom-2 left-3 text-lg smart-capitalize">
        {config.name}
      </div>
    </div>
  );
}
