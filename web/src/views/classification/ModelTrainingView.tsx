import { baseUrl } from "@/api/baseUrl";
import TextEntryDialog from "@/components/overlay/dialog/TextEntryDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useOptimisticState from "@/hooks/use-optimistic-state";
import { cn } from "@/lib/utils";
import { CustomClassificationModelConfig } from "@/types/frigateConfig";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import useSWR from "swr";

type ModelTrainingViewProps = {
  model: CustomClassificationModelConfig;
};
export default function ModelTrainingView({ model }: ModelTrainingViewProps) {
  const [page, setPage] = useState<string>("train");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);

  // dataset

  const { data: trainImages } = useSWR(`classification/${model.name}/train`);
  const { data: dataset } = useSWR(`classification/${model.name}/dataset`);

  // actions

  const trainModel = useCallback(() => {
    axios.post(`classification/${model.name}/train`);
  }, [model]);

  return (
    <div className="flex size-full flex-col gap-2 overflow-hidden p-2">
      <div className="flex flex-row justify-between gap-2 align-middle">
        <LibrarySelector
          pageToggle={pageToggle}
          dataset={dataset}
          trainImages={trainImages}
          setPageToggle={setPageToggle}
          onDelete={() => {}}
          onRename={() => {}}
        />
        <Button onClick={trainModel}>Train Model</Button>
      </div>
      {pageToggle == "train" ? (
        <TrainGrid
          model={model}
          trainImages={trainImages}
          selected={false}
          onClickImages={() => {}}
          onDelete={() => {}}
        />
      ) : (
        <DatasetGrid />
      )}
    </div>
  );
}

type LibrarySelectorProps = {
  pageToggle: string | undefined;
  dataset: { [id: string]: string[] };
  trainImages: string[];
  setPageToggle: (toggle: string) => void;
  onDelete: (name: string, ids: string[], isName: boolean) => void;
  onRename: (old_name: string, new_name: string) => void;
};
function LibrarySelector({
  pageToggle,
  dataset,
  trainImages,
  setPageToggle,
  onDelete,
  onRename,
}: LibrarySelectorProps) {
  const { t } = useTranslation(["views/faceLibrary"]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renameFace, setRenameFace] = useState<string | null>(null);

  const handleDeleteFace = useCallback(
    (name: string) => {
      // Get all image IDs for this face
      const imageIds = dataset?.[name] || [];

      onDelete(name, imageIds, true);
      setPageToggle("train");
    },
    [dataset, onDelete, setPageToggle],
  );

  const handleSetOpen = useCallback(
    (open: boolean) => {
      setRenameFace(open ? renameFace : null);
    },
    [renameFace],
  );

  return (
    <>
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteFaceLibrary.title")}</DialogTitle>
            <DialogDescription>
              {t("deleteFaceLibrary.desc", { name: confirmDelete })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              {t("button.cancel", { ns: "common" })}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) {
                  handleDeleteFace(confirmDelete);
                  setConfirmDelete(null);
                }
              }}
            >
              {t("button.delete", { ns: "common" })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TextEntryDialog
        open={!!renameFace}
        setOpen={handleSetOpen}
        title={t("renameFace.title")}
        description={t("renameFace.desc", { name: renameFace })}
        onSave={(newName) => {
          onRename(renameFace!, newName);
          setRenameFace(null);
        }}
        defaultValue={renameFace || ""}
        regexPattern={/^[\p{L}\p{N}\s'_-]{1,50}$/u}
        regexErrorMessage={t("description.invalidName")}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex justify-between smart-capitalize">
            {pageToggle == "train" ? t("train.title") : pageToggle}
            <span className="ml-2 text-primary-variant">
              (
              {(pageToggle &&
                (pageToggle == "train"
                  ? trainImages.length
                  : dataset?.[pageToggle]?.length)) ||
                0}
              )
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="scrollbar-container max-h-[40dvh] min-w-[220px] overflow-y-auto"
          align="start"
        >
          <DropdownMenuItem
            className="flex cursor-pointer items-center justify-start gap-2"
            aria-label={t("train.aria")}
            onClick={() => setPageToggle("train")}
          >
            <div>{t("train.title")}</div>
            <div className="text-secondary-foreground">
              ({trainImages.length})
            </div>
          </DropdownMenuItem>
          {trainImages.length > 0 && Object.keys(dataset).length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="mb-1 ml-1.5 text-xs text-secondary-foreground">
                {t("collections")}
              </div>
            </>
          )}
          {Object.keys(dataset).map((id) => (
            <DropdownMenuItem
              key={id}
              className="group flex items-center justify-between"
            >
              <div
                className="flex-grow cursor-pointer"
                onClick={() => setPageToggle(id)}
              >
                {id}
                <span className="ml-2 text-muted-foreground">
                  ({dataset?.[id].length})
                </span>
              </div>
              <div className="flex gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameFace(id);
                      }}
                    >
                      <LuPencil className="size-4 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent>{t("button.renameFace")}</TooltipContent>
                  </TooltipPortal>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(id);
                      }}
                    >
                      <LuTrash2 className="size-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent>{t("button.deleteFace")}</TooltipContent>
                  </TooltipPortal>
                </Tooltip>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

type DatasetGridProps = {
  name: string;
  images: string[];
  onDelete: (name: string, ids: string[]) => void;
};
function DatasetGrid({ name, images, onDelete }: DatasetGridProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-lg bg-card outline outline-[3px]",
      )}
    >
      <div
        className={cn(
          "w-full overflow-hidden p-2 *:text-card-foreground",
          isMobile && "flex justify-center",
        )}
      >
        <img
          className="h-40 rounded-lg"
          src={`${baseUrl}clips/faces/${name}/${images}`}
        />
      </div>
      <div className="rounded-b-lg bg-card p-3">
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <div className="flex flex-col items-start text-xs text-primary-variant">
            <div className="smart-capitalize">{name}</div>
          </div>
          <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
            <Tooltip>
              <TooltipTrigger>
                <LuTrash2
                  className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(name, images);
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>{t("button.deleteFaceAttempts")}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

type TrainGridProps = {
  model: CustomClassificationModelConfig;
  trainImages: string[];
  selected: boolean;
  onClickImages: (images: string[], ctrl: boolean) => void;
  onDelete: (name: string, ids: string[]) => void;
};
function TrainGrid({
  model,
  trainImages,
  selected,
  onClickImages,
  onDelete,
}: TrainGridProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  const trainData = useMemo(
    () =>
      trainImages.map((raw) => {
        const parts = raw.replaceAll(".webp", "").split("-");
        return {
          raw,
          timestamp: parts[0],
          label: parts[1],
          score: Number.parseFloat(parts[2]) * 100,
        };
      }),
    [trainImages],
  );

  return (
    <div className="grid size-full grid-cols-10 gap-2 overflow-y-auto">
      {trainData.map((data) => (
        <div
          className={cn(
            "flex cursor-pointer flex-col gap-2 rounded-lg bg-card outline outline-[3px]",
            selected
              ? "shadow-selected outline-selected"
              : "outline-transparent duration-500",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onClickImages([data.raw], e.ctrlKey || e.metaKey);
          }}
        >
          <div
            className={cn(
              "w-full overflow-hidden p-2 *:text-card-foreground",
              isMobile && "flex justify-center",
            )}
          >
            <img
              className="h-48 rounded-lg"
              src={`${baseUrl}clips/${model.name}/${data.raw}`}
            />
          </div>
          <div className="rounded-b-lg bg-card p-3">
            <div className="flex w-full flex-row items-center justify-between gap-2">
              <div className="flex flex-col items-start text-xs text-primary-variant">
                <div className="smart-capitalize">{data.label}</div>
                <div>{data.score}%</div>
              </div>
              <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
                <Tooltip>
                  <TooltipTrigger>
                    <LuTrash2
                      className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete("train", [data.raw]);
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("button.deleteClassificationAttempts")}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
