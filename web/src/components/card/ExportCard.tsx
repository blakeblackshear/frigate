import ActivityIndicator from "../indicators/activity-indicator";
import { LuTrash } from "react-icons/lu";
import { Button } from "../ui/button";
import { useCallback, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { FaDownload, FaPlay, FaShareAlt } from "react-icons/fa";
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
import { DeleteClipType, Export } from "@/types/export";
import { MdEditSquare } from "react-icons/md";
import { baseUrl } from "@/api/baseUrl";
import { cn } from "@/lib/utils";
import { shareOrCopy } from "@/utils/browserUtil";
import { useTranslation } from "react-i18next";
import { ImageShadowOverlay } from "../overlay/ImageShadowOverlay";
import BlurredIconButton from "../button/BlurredIconButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useIsAdmin } from "@/hooks/use-is-admin";

type ExportProps = {
  className: string;
  exportedRecording: Export;
  onSelect: (selected: Export) => void;
  onRename: (original: string, update: string) => void;
  onDelete: ({ file, exportName }: DeleteClipType) => void;
};

export default function ExportCard({
  className,
  exportedRecording,
  onSelect,
  onRename,
  onDelete,
}: ExportProps) {
  const { t } = useTranslation(["views/exports"]);
  const isAdmin = useIsAdmin();
  const [hovered, setHovered] = useState(false);
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
          "relative flex aspect-video items-center justify-center rounded-lg bg-black md:rounded-2xl",
          className,
        )}
        onMouseEnter={isDesktop ? () => setHovered(true) : undefined}
        onMouseLeave={isDesktop ? () => setHovered(false) : undefined}
        onClick={isDesktop ? undefined : () => setHovered(!hovered)}
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
        {hovered && (
          <>
            <div className="absolute inset-0 rounded-lg bg-black bg-opacity-60 md:rounded-2xl" />
            <div className="absolute right-3 top-2">
              <div className="flex items-center justify-center gap-4">
                {!exportedRecording.in_progress && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BlurredIconButton
                        onClick={() =>
                          shareOrCopy(
                            `${baseUrl}export?id=${exportedRecording.id}`,
                            exportedRecording.name.replaceAll("_", " "),
                          )
                        }
                      >
                        <FaShareAlt className="size-4" />
                      </BlurredIconButton>
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltip.shareExport")}</TooltipContent>
                  </Tooltip>
                )}
                {!exportedRecording.in_progress && (
                  <a
                    download
                    href={`${baseUrl}${exportedRecording.video_path.replace("/media/frigate/", "")}`}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <BlurredIconButton>
                          <FaDownload className="size-4" />
                        </BlurredIconButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("tooltip.downloadVideo")}
                      </TooltipContent>
                    </Tooltip>
                  </a>
                )}
                {isAdmin && !exportedRecording.in_progress && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BlurredIconButton
                        onClick={() =>
                          setEditName({
                            original: exportedRecording.name,
                            update: undefined,
                          })
                        }
                      >
                        <MdEditSquare className="size-4" />
                      </BlurredIconButton>
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltip.editName")}</TooltipContent>
                  </Tooltip>
                )}
                {isAdmin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BlurredIconButton
                        onClick={() =>
                          onDelete({
                            file: exportedRecording.id,
                            exportName: exportedRecording.name,
                          })
                        }
                      >
                        <LuTrash className="size-4 fill-destructive text-destructive hover:text-white" />
                      </BlurredIconButton>
                    </TooltipTrigger>
                    <TooltipContent>{t("tooltip.deleteExport")}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {!exportedRecording.in_progress && (
              <Button
                className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer text-white hover:bg-transparent hover:text-white"
                aria-label={t("button.play", { ns: "common" })}
                variant="ghost"
                onClick={() => {
                  onSelect(exportedRecording);
                }}
              >
                <FaPlay />
              </Button>
            )}
          </>
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
