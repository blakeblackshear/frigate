import ActivityIndicator from "../indicators/activity-indicator";
import { Button } from "../ui/button";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { DeleteClipType, Export, ExportCase, ExportJob } from "@/types/export";
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
import { FaFolder, FaVideo } from "react-icons/fa";
import { HiSquare2Stack } from "react-icons/hi2";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import useContextMenu from "@/hooks/use-contextmenu";

type CaseCardProps = {
  className: string;
  exportCase: ExportCase;
  exports: Export[];
  onSelect: () => void;
};
export function CaseCard({
  className,
  exportCase,
  exports,
  onSelect,
}: CaseCardProps) {
  const { t } = useTranslation(["views/exports"]);
  const firstExport = useMemo(
    () => exports.find((exp) => exp.thumb_path && exp.thumb_path.length > 0),
    [exports],
  );
  const cameraCount = useMemo(
    () => new Set(exports.map((exp) => exp.camera)).size,
    [exports],
  );

  return (
    <div
      className={cn(
        "relative flex aspect-video size-full cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-secondary md:rounded-2xl",
        className,
      )}
      onClick={() => onSelect()}
    >
      {firstExport && (
        <img
          className="absolute inset-0 size-full object-cover"
          src={`${baseUrl}${firstExport.thumb_path.replace("/media/frigate/", "")}`}
          alt=""
        />
      )}
      {!firstExport && (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/80 to-muted" />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute right-1 top-1 z-40 flex items-center gap-2 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
        <div className="flex items-center gap-1">
          <HiSquare2Stack className="size-3" />
          <div>{exports.length}</div>
        </div>
        <div className="flex items-center gap-1">
          <FaVideo className="size-3" />
          <div>{cameraCount}</div>
        </div>
      </div>
      <div className="absolute inset-x-2 bottom-2 z-20 text-white">
        <div className="flex items-center justify-start gap-2">
          <FaFolder />
          <div className="truncate smart-capitalize">{exportCase.name}</div>
        </div>
        {exports.length === 0 && (
          <div className="mt-1 text-xs text-white/80">
            {t("caseCard.emptyCase")}
          </div>
        )}
      </div>
    </div>
  );
}

type ExportCardProps = {
  className: string;
  exportedRecording: Export;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect: (selected: Export) => void;
  onContextSelect?: (selected: Export) => void;
  onRename: (original: string, update: string) => void;
  onDelete: ({ file, exportName }: DeleteClipType) => void;
  onAssignToCase?: (selected: Export) => void;
  onRemoveFromCase?: (selected: Export) => void;
};
export function ExportCard({
  className,
  exportedRecording,
  isSelected,
  selectionMode,
  onSelect,
  onContextSelect,
  onRename,
  onDelete,
  onAssignToCase,
  onRemoveFromCase,
}: ExportCardProps) {
  const { t } = useTranslation(["views/exports"]);
  const isAdmin = useIsAdmin();
  const [loading, setLoading] = useState(
    exportedRecording.thumb_path.length > 0,
  );

  // selection

  const cardRef = useRef<HTMLDivElement | null>(null);
  useContextMenu(cardRef, () => {
    if (!exportedRecording.in_progress && onContextSelect) {
      onContextSelect(exportedRecording);
    }
  });

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
        ref={cardRef}
        className={cn(
          "relative flex aspect-video cursor-pointer items-center justify-center rounded-lg bg-black md:rounded-2xl",
          className,
        )}
        onClick={(e) => {
          if (!exportedRecording.in_progress) {
            if ((selectionMode || e.ctrlKey || e.metaKey) && onContextSelect) {
              onContextSelect(exportedRecording);
            } else {
              onSelect(exportedRecording);
            }
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
        {!exportedRecording.in_progress && !selectionMode && (
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
                {isAdmin && onRemoveFromCase && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    aria-label={t("tooltip.removeFromCase")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromCase(exportedRecording);
                    }}
                  >
                    {t("tooltip.removeFromCase")}
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
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 size-full rounded-lg outline outline-[3px] -outline-offset-[2.8px] md:rounded-2xl",
            isSelected
              ? "shadow-selected outline-selected"
              : "outline-transparent duration-500",
          )}
        />
        <div className="absolute bottom-2 left-3 right-12 z-30 text-white">
          <div className="truncate smart-capitalize">
            {exportedRecording.name.replaceAll("_", " ")}
          </div>
        </div>
      </div>
    </>
  );
}

type ActiveExportJobCardProps = {
  className?: string;
  job: ExportJob;
};

export function ActiveExportJobCard({
  className = "",
  job,
}: ActiveExportJobCardProps) {
  const { t } = useTranslation(["views/exports", "common"]);
  const cameraName = useCameraFriendlyName(job.camera);
  const displayName = useMemo(() => {
    if (job.name && job.name.length > 0) {
      return job.name.replaceAll("_", " ");
    }

    return t("jobCard.defaultName", {
      camera: cameraName,
    });
  }, [cameraName, job.name, t]);
  const statusLabel =
    job.status === "queued" ? t("jobCard.queued") : t("jobCard.running");

  return (
    <div
      className={cn(
        "relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary/40 md:rounded-2xl",
        className,
      )}
    >
      <div className="absolute right-3 top-3 z-30 rounded-full bg-selected/90 px-2 py-1 text-xs text-selected-foreground">
        {statusLabel}
      </div>
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <ActivityIndicator />
        <div className="text-sm font-medium text-primary">{displayName}</div>
      </div>
    </div>
  );
}
