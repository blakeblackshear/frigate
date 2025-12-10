import { useCallback, useState } from "react";
import axios from "axios";
import { Button, buttonVariants } from "../ui/button";
import { isDesktop } from "react-device-detect";
import { HiTrash } from "react-icons/hi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
import { useIsAdmin } from "@/hooks/use-is-admin";

type SearchActionGroupProps = {
  selectedObjects: string[];
  setSelectedObjects: (ids: string[]) => void;
  pullLatestData: () => void;
  onSelectAllObjects: () => void;
  totalItems: number;
};
export default function SearchActionGroup({
  selectedObjects,
  setSelectedObjects,
  pullLatestData,
  onSelectAllObjects,
  totalItems,
}: SearchActionGroupProps) {
  const { t } = useTranslation(["components/filter"]);
  const isAdmin = useIsAdmin();
  const onClearSelected = useCallback(() => {
    setSelectedObjects([]);
  }, [setSelectedObjects]);

  const onDelete = useCallback(async () => {
    await axios
      .delete(`events/`, {
        data: { event_ids: selectedObjects },
      })
      .then((resp) => {
        if (resp.status == 200) {
          toast.success(t("trackedObjectDelete.toast.success"), {
            position: "top-center",
          });
          setSelectedObjects([]);
          pullLatestData();
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(t("trackedObjectDelete.toast.error", { errorMessage }), {
          position: "top-center",
        });
      });
  }, [selectedObjects, setSelectedObjects, pullLatestData, t]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bypassDialog, setBypassDialog] = useState(false);

  useKeyboardListener(["Shift"], (_, modifiers) => {
    setBypassDialog(modifiers.shift);
    return false;
  });

  const handleDelete = useCallback(() => {
    if (bypassDialog) {
      onDelete();
    } else {
      setDeleteDialogOpen(true);
    }
  }, [bypassDialog, onDelete]);

  return (
    <>
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("trackedObjectDelete.title")}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <Trans
              ns="components/filter"
              values={{ objectLength: selectedObjects.length }}
            >
              trackedObjectDelete.desc
            </Trans>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={onDelete}
            >
              {t("button.delete", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="absolute inset-x-2 inset-y-0 flex items-center justify-between gap-2 bg-background py-2 md:left-auto">
        <div className="mx-1 flex items-center justify-center text-sm text-muted-foreground">
          <div className="p-1">
            {t("selected", {
              ns: "views/events",
              count: selectedObjects.length,
            })}
          </div>
          <div className="p-1">{"|"}</div>
          <div
            className="cursor-pointer p-2 text-primary hover:rounded-lg hover:bg-secondary"
            onClick={onClearSelected}
          >
            {t("button.unselect", { ns: "common" })}
          </div>
          {selectedObjects.length < totalItems && (
            <>
              <div className="p-1">{"|"}</div>
              <div
                className="cursor-pointer p-2 text-primary hover:rounded-lg hover:bg-secondary"
                onClick={onSelectAllObjects}
              >
                {t("select_all", { ns: "views/events" })}
              </div>
            </>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              className="flex items-center gap-2 p-2"
              aria-label={t("button.delete", { ns: "common" })}
              size="sm"
              onClick={handleDelete}
            >
              <HiTrash className="text-secondary-foreground" />
              {isDesktop && (
                <div className="text-primary">
                  {bypassDialog
                    ? t("button.deleteNow", { ns: "common" })
                    : t("button.delete", { ns: "common" })}
                </div>
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
