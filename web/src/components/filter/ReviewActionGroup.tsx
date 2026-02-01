import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";
import { useCallback, useState } from "react";
import axios from "axios";
import { Button, buttonVariants } from "../ui/button";
import { isDesktop } from "react-device-detect";
import { FaCompactDisc } from "react-icons/fa";
import { HiTrash } from "react-icons/hi";
import { ReviewSegment } from "@/types/review";
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
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/use-is-admin";

type ReviewActionGroupProps = {
  selectedReviews: ReviewSegment[];
  setSelectedReviews: (reviews: ReviewSegment[]) => void;
  onExport: (id: string) => void;
  pullLatestData: () => void;
};
export default function ReviewActionGroup({
  selectedReviews,
  setSelectedReviews,
  onExport,
  pullLatestData,
}: ReviewActionGroupProps) {
  const { t } = useTranslation(["components/dialog"]);
  const isAdmin = useIsAdmin();
  const onClearSelected = useCallback(() => {
    setSelectedReviews([]);
  }, [setSelectedReviews]);

  const allReviewed = selectedReviews.every(
    (review) => review.has_been_reviewed,
  );

  const onToggleReviewed = useCallback(async () => {
    const ids = selectedReviews.map((review) => review.id);
    await axios.post(`reviews/viewed`, {
      ids,
      reviewed: !allReviewed,
    });
    setSelectedReviews([]);
    pullLatestData();
  }, [selectedReviews, setSelectedReviews, pullLatestData, allReviewed]);

  const onDelete = useCallback(() => {
    const ids = selectedReviews.map((review) => review.id);
    axios
      .post(`reviews/delete`, { ids })
      .then((resp) => {
        if (resp.status === 200) {
          toast.success(t("recording.confirmDelete.toast.success"), {
            position: "top-center",
          });
          setSelectedReviews([]);
          pullLatestData();
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("recording.confirmDelete.toast.error", {
            error: errorMessage,
          }),
          {
            position: "top-center",
          },
        );
      });
  }, [selectedReviews, setSelectedReviews, pullLatestData, t]);

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
              {t("recording.confirmDelete.title")}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <Trans ns="components/dialog">
              recording.confirmDelete.desc.selected
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
              count: selectedReviews.length,
            })}
          </div>
          <div className="p-1">{"|"}</div>
          <div
            className="cursor-pointer p-2 text-primary hover:rounded-lg hover:bg-secondary"
            onClick={onClearSelected}
          >
            {t("button.unselect", { ns: "common" })}
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          {selectedReviews.length == 1 && (
            <Button
              className="flex items-center gap-2 p-2"
              aria-label={t("recording.button.export")}
              size="sm"
              onClick={() => {
                onExport(selectedReviews[0].id);
                onClearSelected();
              }}
            >
              <FaCompactDisc className="text-secondary-foreground" />
              {isDesktop && (
                <div className="text-primary">
                  {t("recording.button.export")}
                </div>
              )}
            </Button>
          )}
          <Button
            className="flex items-center gap-2 p-2"
            aria-label={
              allReviewed
                ? t("recording.button.markAsUnreviewed")
                : t("recording.button.markAsReviewed")
            }
            size="sm"
            onClick={onToggleReviewed}
          >
            {allReviewed ? (
              <FaCircleXmark className="text-secondary-foreground" />
            ) : (
              <FaCircleCheck className="text-secondary-foreground" />
            )}
            {isDesktop && (
              <div className="text-primary">
                {allReviewed
                  ? t("recording.button.markAsUnreviewed")
                  : t("recording.button.markAsReviewed")}
              </div>
            )}
          </Button>
          {isAdmin && (
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
                    ? t("recording.button.deleteNow")
                    : t("button.delete", { ns: "common" })}
                </div>
              )}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
