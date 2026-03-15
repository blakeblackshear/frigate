import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trans } from "react-i18next";
import axios from "axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Switch } from "@/components/ui/switch";

type DeleteCameraDialogProps = {
  show: boolean;
  cameras: string[];
  onClose: () => void;
  onDeleted: () => void;
};

export default function DeleteCameraDialog({
  show,
  cameras,
  onClose,
  onDeleted,
}: DeleteCameraDialogProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const [phase, setPhase] = useState<"select" | "confirm">("select");
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [deleteExports, setDeleteExports] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = useCallback(() => {
    if (isDeleting) return;
    setPhase("select");
    setSelectedCamera("");
    setDeleteExports(false);
    onClose();
  }, [isDeleting, onClose]);

  const handleDelete = useCallback(() => {
    setPhase("confirm");
  }, []);

  const handleBack = useCallback(() => {
    setPhase("select");
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedCamera || isDeleting) return;

    setIsDeleting(true);

    try {
      await axios.delete(
        `cameras/${selectedCamera}?delete_exports=${deleteExports}`,
      );
      toast.success(
        t("cameraManagement.deleteCameraDialog.success", {
          cameraName: selectedCamera,
        }),
        { position: "top-center" },
      );
      setPhase("select");
      setSelectedCamera("");
      setDeleteExports(false);
      onDeleted();
    } catch (error) {
      const errorMessage =
        axios.isAxiosError(error) &&
        (error.response?.data?.message || error.response?.data?.detail)
          ? error.response?.data?.message || error.response?.data?.detail
          : t("cameraManagement.deleteCameraDialog.error", {
              cameraName: selectedCamera,
            });

      toast.error(errorMessage, { position: "top-center" });
    } finally {
      setIsDeleting(false);
    }
  }, [selectedCamera, deleteExports, isDeleting, onDeleted, t]);

  return (
    <Dialog open={show} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {phase === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("cameraManagement.deleteCameraDialog.title")}
              </DialogTitle>
              <DialogDescription>
                {t("cameraManagement.deleteCameraDialog.description")}
              </DialogDescription>
            </DialogHeader>
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t(
                    "cameraManagement.deleteCameraDialog.selectPlaceholder",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {cameras.map((camera) => (
                  <SelectItem key={camera} value={camera}>
                    {camera}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter className="flex gap-3 sm:justify-end">
              <div className="flex flex-1 flex-col justify-end">
                <div className="flex flex-row gap-2 pt-5">
                  <Button
                    className="flex flex-1"
                    aria-label={t("button.cancel", { ns: "common" })}
                    onClick={handleClose}
                    type="button"
                  >
                    {t("button.cancel", { ns: "common" })}
                  </Button>
                  <Button
                    variant="destructive"
                    aria-label={t("button.delete", { ns: "common" })}
                    className="flex flex-1 text-white"
                    onClick={handleDelete}
                    disabled={!selectedCamera}
                  >
                    {t("button.delete", { ns: "common" })}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("cameraManagement.deleteCameraDialog.confirmTitle")}
              </DialogTitle>
              <DialogDescription>
                <Trans
                  ns="views/settings"
                  values={{ cameraName: selectedCamera }}
                  components={{ strong: <span className="font-medium" /> }}
                >
                  cameraManagement.deleteCameraDialog.confirmWarning
                </Trans>
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <Switch
                id="delete-exports"
                checked={deleteExports}
                onCheckedChange={(checked) =>
                  setDeleteExports(checked === true)
                }
              />
              <Label htmlFor="delete-exports" className="cursor-pointer">
                {t("cameraManagement.deleteCameraDialog.deleteExports")}
              </Label>
            </div>
            <DialogFooter className="flex gap-3 sm:justify-end">
              <div className="flex flex-1 flex-col justify-end">
                <div className="flex flex-row gap-2 pt-5">
                  <Button
                    className="flex flex-1"
                    aria-label={t("button.back", { ns: "common" })}
                    onClick={handleBack}
                    type="button"
                    disabled={isDeleting}
                  >
                    {t("button.back", { ns: "common" })}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex flex-1 text-white"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <div className="flex flex-row items-center gap-2">
                        <ActivityIndicator />
                        <span>
                          {t(
                            "cameraManagement.deleteCameraDialog.confirmButton",
                          )}
                        </span>
                      </div>
                    ) : (
                      t("cameraManagement.deleteCameraDialog.confirmButton")
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
