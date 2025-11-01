import { baseUrl } from "@/api/baseUrl";
import ClassificationModelWizardDialog from "@/components/classification/ClassificationModelWizardDialog";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { ImageShadowOverlay } from "@/components/overlay/ImageShadowOverlay";
import { Button, buttonVariants } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import useOptimisticState from "@/hooks/use-optimistic-state";
import { cn } from "@/lib/utils";
import {
  CustomClassificationModelConfig,
  FrigateConfig,
} from "@/types/frigateConfig";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaFolderPlus } from "react-icons/fa";
import { MdModelTraining } from "react-icons/md";
import { LuTrash2 } from "react-icons/lu";
import { FiMoreVertical } from "react-icons/fi";
import useSWR from "swr";
import Heading from "@/components/ui/heading";
import { useOverlayState } from "@/hooks/use-overlay-state";
import axios from "axios";
import { toast } from "sonner";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BlurredIconButton from "@/components/button/BlurredIconButton";

const allModelTypes = ["objects", "states"] as const;
type ModelType = (typeof allModelTypes)[number];

type ModelSelectionViewProps = {
  onClick: (model: CustomClassificationModelConfig) => void;
};
export default function ModelSelectionView({
  onClick,
}: ModelSelectionViewProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const [page, setPage] = useOverlayState<ModelType>("objects", "objects");
  const [pageToggle, setPageToggle] = useOptimisticState(
    page || "objects",
    setPage,
    100,
  );
  const { data: config, mutate: refreshConfig } = useSWR<FrigateConfig>(
    "config",
    {
      revalidateOnFocus: false,
    },
  );

  // title

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

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

  return (
    <div className="flex size-full flex-col p-2">
      <ClassificationModelWizardDialog
        open={newModel}
        defaultModelType={pageToggle === "objects" ? "object" : "state"}
        onClose={() => {
          setNewModel(false);
          refreshConfig();
        }}
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
            {t("button.addClassification")}
          </Button>
        </div>
      </div>
      {selectedClassificationConfigs.length === 0 ? (
        <NoModelsView
          onCreateModel={() => setNewModel(true)}
          modelType={pageToggle}
        />
      ) : (
        <div className="grid auto-rows-max grid-cols-2 gap-2 overflow-y-auto p-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10">
          {selectedClassificationConfigs.map((config) => (
            <ModelCard
              key={config.name}
              config={config}
              onClick={() => onClick(config)}
              onDelete={() => refreshConfig()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoModelsView({
  onCreateModel,
  modelType,
}: {
  onCreateModel: () => void;
  modelType: ModelType;
}) {
  const { t } = useTranslation(["views/classificationModel"]);
  const typeKey = modelType === "objects" ? "object" : "state";

  return (
    <div className="flex size-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <MdModelTraining className="size-8" />
        <Heading as="h4">{t(`noModels.${typeKey}.title`)}</Heading>
        <div className="mb-3 text-center text-secondary-foreground">
          {t(`noModels.${typeKey}.description`)}
        </div>
        <Button size="sm" variant="select" onClick={onCreateModel}>
          {t(`noModels.${typeKey}.buttonText`)}
        </Button>
      </div>
    </div>
  );
}

type ModelCardProps = {
  config: CustomClassificationModelConfig;
  onClick: () => void;
  onDelete: () => void;
};
function ModelCard({ config, onClick, onDelete }: ModelCardProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  const { data: dataset } = useSWR<{
    [id: string]: string[];
  }>(`classification/${config.name}/dataset`, { revalidateOnFocus: false });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const bypassDialogRef = useRef(false);

  useKeyboardListener(["Shift"], (_, modifiers) => {
    bypassDialogRef.current = modifiers.shift;
    return false;
  });

  const handleDelete = useCallback(async () => {
    await axios
      .delete(`classification/${config.name}`)
      .then((resp) => {
        if (resp.status == 200) {
          toast.success(t("toast.success.deletedModel", { count: 1 }), {
            position: "top-center",
          });
          onDelete();
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(t("toast.error.deleteModelFailed", { errorMessage }), {
          position: "top-center",
        });
      });
  }, [config, onDelete, t]);

  const handleDeleteClick = useCallback(() => {
    if (bypassDialogRef.current) {
      handleDelete();
    } else {
      setDeleteDialogOpen(true);
    }
  }, [handleDelete]);

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
    <>
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteModel.title")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {t("deleteModel.single", { name: config.name })}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleDelete}
            >
              {t("button.delete", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        className={cn(
          "relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg",
        )}
        onClick={onClick}
      >
        <img
          className="size-full"
          src={`${baseUrl}clips/${config.name}/dataset/${coverImage?.name}/${coverImage?.img}`}
        />
        <ImageShadowOverlay />
        <div className="absolute bottom-2 left-3 text-lg text-white smart-capitalize">
          {config.name}
        </div>
        <div className="absolute bottom-2 right-2 z-40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <BlurredIconButton>
                <FiMoreVertical className="size-5 text-white" />
              </BlurredIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDeleteClick}>
                <LuTrash2 className="mr-2 size-4" />
                <span>
                  {bypassDialogRef.current
                    ? t("button.deleteNow", { ns: "common" })
                    : t("button.delete", { ns: "common" })}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
