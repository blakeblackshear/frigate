import ActivityIndicator from "../indicators/activity-indicator";
import { Button } from "../ui/button";
import { useCallback, useState } from "react";
import { isMobile } from "react-device-detect";
import { FiMoreVertical } from "react-icons/fi";
import { Skeleton } from "../ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { DeleteClipType, Export, ExportCase } from "@/types/export";
import { baseUrl } from "@/api/baseUrl";
import { cn } from "@/lib/utils";
import { shareOrCopy } from "@/utils/browserUtil";
import { useTranslation } from "react-i18next";
import { ImageShadowOverlay } from "../overlay/ImageShadowOverlay";
import BlurredIconButton from "../button/BlurredIconButton";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { FaFolder } from "react-icons/fa";

type CaseCardProps = {
  className: string;
  exportCase: ExportCase;
  onSelect: () => void;
};
export function CaseCard({ className, exportCase, onSelect }: CaseCardProps) {
  return (
    <div
      className={cn(
        "relative flex aspect-video size-full cursor-pointer items-center justify-center rounded-lg bg-secondary md:rounded-2xl",
        className,
      )}
      onClick={() => onSelect()}
    >
      <div className="absolute bottom-2 left-2 flex items-center justify-start gap-2">
        <FaFolder />
        <div className="capitalize">{exportCase.name}</div>
      </div>
    </div>
  );
}

type ExportCardProps = {
  className: string;
  exportedRecording: Export;
  onSelect: (selected: Export) => void;
  onRename: (original: string, update: string) => void;
  onDelete: ({ file, exportName }: DeleteClipType) => void;
  onAssignToCase?: (selected: Export) => void;
};
export function ExportCard({
  className,
  exportedRecording,
  onSelect,
  onRename,
  onDelete,
  onAssignToCase,
}: ExportCardProps) {
  const { t } = useTranslation(["views/exports"]);
  const isAdmin = useIsAdmin();
  const [loading, setLoading] = useState(
    exportedRecording.thumb_path.length > 0,
  );

  // editing name

  const [editName, setEditName] = useState<{
    original: string;
    update?: string;
  }>();

  const submitRename = useCallback(() => {
    if (editName == undefined) {
      return;
    }

    onRename(exportedRecording.id, editName.update ?? "");
    setEditName(undefined);
  }, [editName, exportedRecording, onRename, setEditName]);

  useKeyboardListener(
    editName != undefined ? ["Enter"] : [],
    (key, modifiers) => {
      if (
        key == "Enter" &&
        modifiers.down &&
        !modifiers.repeat &&
        editName &&
        (editName.update?.length ?? 0) > 0
      ) {
        submitRename();
        return true;
      }

      return false;
    },
  );

  return (
    <>
      <Dialog
        open={editName != undefined}
        onOpenChange={(open) => {
          if (!open) {
            setEditName(undefined);
          }
        }}
      >
        <DialogContent
          onOpenAutoFocus={(e) => {
            if (isMobile) {
              e.preventDefault();
            }
          }}
        >
          <DialogTitle>{t("editExport.title")}</DialogTitle>
          <DialogDescription>{t("editExport.desc")}</DialogDescription>
          {editName && (
            <>
              <Input
                className="text-md mt-3"
                type="search"
                placeholder={editName?.original}
                value={
                  editName?.update == undefined
                    ? editName?.original
                    : editName?.update
                }
                onChange={(e) =>
                  setEditName({
                    original: editName.original ?? "",
                    update: e.target.value,
                  })
                }
              />
              <DialogFooter>
                <Button
                  aria-label={t("editExport.saveExport")}
                  size="sm"
                  variant="select"
                  disabled={(editName?.update?.length ?? 0) == 0}
                  onClick={() => submitRename()}
                >
                  {t("button.save", { ns: "common" })}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div
        className={cn(
          "relative flex aspect-video cursor-pointer items-center justify-center rounded-lg bg-black md:rounded-2xl",
          className,
        )}
        onClick={() => {
          if (!exportedRecording.in_progress) {
            onSelect(exportedRecording);
          }
        }}
      >
        {exportedRecording.in_progress ? (
          <ActivityIndicator />
        ) : (
          <>
            {exportedRecording.thumb_path.length > 0 ? (
              <img
                className="absolute inset-0 aspect-video size-full rounded-lg object-cover md:rounded-2xl"
                src={`${baseUrl}${exportedRecording.thumb_path.replace("/media/frigate/", "")}`}
                onLoad={() => setLoading(false)}
              />
            ) : (
              <div className="absolute inset-0 rounded-lg bg-secondary md:rounded-2xl" />
            )}
          </>
        )}
        {!exportedRecording.in_progress && (
          <div className="absolute bottom-2 right-3 z-40">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger>
                <BlurredIconButton
                  aria-label={t("tooltip.editName")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <FiMoreVertical className="size-5" />
                </BlurredIconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  aria-label={t("tooltip.shareExport")}
                  onClick={(e) => {
                    e.stopPropagation();
                    shareOrCopy(
                      `${baseUrl}export?id=${exportedRecording.id}`,
                      exportedRecording.name.replaceAll("_", " "),
                    );
                  }}
                >
                  {t("tooltip.shareExport")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  aria-label={t("tooltip.downloadVideo")}
                >
                  <a
                    download
                    href={`${baseUrl}${exportedRecording.video_path.replace("/media/frigate/", "")}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("tooltip.downloadVideo")}
                  </a>
                </DropdownMenuItem>
                {isAdmin && onAssignToCase && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    aria-label={t("tooltip.assignToCase")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssignToCase(exportedRecording);
                    }}
                  >
                    {t("tooltip.assignToCase")}
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    aria-label={t("tooltip.editName")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditName({
                        original: exportedRecording.name,
                        update: undefined,
                      });
                    }}
                  >
                    {t("tooltip.editName")}
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    aria-label={t("tooltip.deleteExport")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete({
                        file: exportedRecording.id,
                        exportName: exportedRecording.name,
                      });
                    }}
                  >
                    {t("tooltip.deleteExport")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {loading && (
          <Skeleton className="absolute inset-0 aspect-video rounded-lg md:rounded-2xl" />
        )}
        <ImageShadowOverlay />
        <div className="absolute bottom-2 left-3 flex items-end text-white smart-capitalize">
          {exportedRecording.name.replaceAll("_", " ")}
        </div>
      </div>
    </>
  );
}
