import { baseUrl } from "@/api/baseUrl";
import ExportCard from "@/components/card/ExportCard";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import { cn } from "@/lib/utils";
import { DeleteClipType, Export } from "@/types/export";
import axios from "axios";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";

import { LuFolderX } from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";

function Exports() {
  const { t } = useTranslation(["views/exports"]);
  const { data: exports, mutate } = useSWR<Export[]>("exports");

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  // Search

  const [search, setSearch] = useState("");

  const filteredExports = useMemo(() => {
    if (!search || !exports) {
      return exports;
    }

    return exports.filter((exp) =>
      exp.name
        .toLowerCase()
        .replaceAll("_", " ")
        .includes(search.toLowerCase()),
    );
  }, [exports, search]);

  // Viewing

  const [selected, setSelected] = useState<Export>();
  const [selectedAspect, setSelectedAspect] = useState(0.0);

  useSearchEffect("id", (id) => {
    if (!exports) {
      return false;
    }

    setSelected(exports.find((exp) => exp.id == id));
    return true;
  });

  // Deleting

  const [deleteClip, setDeleteClip] = useState<DeleteClipType | undefined>();

  const onHandleDelete = useCallback(() => {
    if (!deleteClip) {
      return;
    }

    axios.delete(`export/${deleteClip.file}`).then((response) => {
      if (response.status == 200) {
        setDeleteClip(undefined);
        mutate();
      }
    });
  }, [deleteClip, mutate]);

  // Renaming

  const onHandleRename = useCallback(
    (id: string, update: string) => {
      axios
        .patch(`export/${id}/rename`, {
          name: update,
        })
        .then((response) => {
          if (response.status === 200) {
            setDeleteClip(undefined);
            mutate();
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(t("toast.error.renameExportFailed", { errorMessage }), {
            position: "top-center",
          });
        });
    },
    [mutate, t],
  );

  // Keyboard Listener

  const contentRef = useRef<HTMLDivElement | null>(null);
  useKeyboardListener([], undefined, contentRef);

  return (
    <div className="flex size-full flex-col gap-2 overflow-hidden px-1 pt-2 md:p-2">
      <Toaster closeButton={true} />

      <AlertDialog
        open={deleteClip != undefined}
        onOpenChange={() => setDeleteClip(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteExport")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteExport.desc", { exportName: deleteClip?.exportName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <Button
              className="text-white"
              aria-label="Delete Export"
              variant="destructive"
              onClick={() => onHandleDelete()}
            >
              {t("button.delete", { ns: "common" })}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={selected != undefined}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(undefined);
          }
        }}
      >
        <DialogContent
          className={cn(
            "max-h-[95dvh] sm:max-w-xl md:max-w-4xl lg:max-w-4xl xl:max-w-7xl",
            isMobile && "landscape:max-w-[60%]",
          )}
        >
          <DialogTitle className="smart-capitalize">
            {selected?.name?.replaceAll("_", " ")}
          </DialogTitle>
          <video
            className={cn(
              "size-full rounded-lg md:rounded-2xl",
              selectedAspect < 1.5 && "aspect-video h-full",
            )}
            playsInline
            preload="auto"
            autoPlay
            controls
            muted
            onLoadedData={(e) =>
              setSelectedAspect(
                e.currentTarget.videoWidth / e.currentTarget.videoHeight,
              )
            }
          >
            <source
              src={`${baseUrl}${selected?.video_path?.replace("/media/frigate/", "")}`}
              type="video/mp4"
            />
          </video>
        </DialogContent>
      </Dialog>

      {exports && (
        <div className="flex w-full items-center justify-center p-2">
          <Input
            className="text-md w-full bg-muted md:w-1/3"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="w-full overflow-hidden">
        {exports && filteredExports && filteredExports.length > 0 ? (
          <div
            ref={contentRef}
            className="scrollbar-container grid size-full gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {Object.values(exports).map((item) => (
              <ExportCard
                key={item.name}
                className={
                  search == "" || filteredExports.includes(item) ? "" : "hidden"
                }
                exportedRecording={item}
                onSelect={setSelected}
                onRename={onHandleRename}
                onDelete={({ file, exportName }) =>
                  setDeleteClip({ file, exportName })
                }
              />
            ))}
          </div>
        ) : exports !== undefined ? (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
            <LuFolderX className="size-16" />
            {t("noExports")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Exports;
