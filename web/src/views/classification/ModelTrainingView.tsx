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
import { CustomClassificationModelConfig } from "@/types/frigateConfig";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import axios from "axios";
import { useCallback, useState } from "react";
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
    <div className="flex size-full flex-col p-2">
      <div className="flex flex-row justify-between gap-2 align-middle">
        <LibrarySelector
          pageToggle={pageToggle}
          dataset={dataset}
          trainImages={trainImages}
          setPageToggle={setPageToggle}
          onDelete={() => {}}
          onRename={() => {}}
        />
        <Button variant="select" onClick={trainModel}>
          Train Model
        </Button>
      </div>
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
              ({(pageToggle && dataset?.[pageToggle]?.length) || 0})
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
