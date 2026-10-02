import CameraWizardDialog from "@/components/settings/CameraWizardDialog";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCircleCheck } from "react-icons/fa6";

type SetupCameraProps = {
  onNext: (
    cameraNames?: string[],
    detectCodecs?: Record<string, string>,
  ) => void;
  onBack: () => void;
};

export default function SetupCamera({ onNext, onBack }: SetupCameraProps) {
  const { t } = useTranslation(["views/setup"]);
  const [showWizard, setShowWizard] = useState(false);
  const [addedCameras, setAddedCameras] = useState<string[]>([]);
  const [detectCodecs, setDetectCodecs] = useState<Record<string, string>>({});
  const handleClose = useCallback(() => {
    setShowWizard(false);
  }, []);

  // the dialog fires this once its config write has succeeded, which is the
  // only reliable signal that a camera was added
  const handleCameraAdded = useCallback(
    ({ name, detectCodec }: { name: string; detectCodec?: string }) => {
      setAddedCameras((previous) =>
        previous.includes(name) ? previous : [...previous, name],
      );

      if (detectCodec) {
        setDetectCodecs((previous) => ({ ...previous, [name]: detectCodec }));
      }
    },
    [],
  );

  const handleNext = useCallback(() => {
    onNext(addedCameras, detectCodecs);
  }, [onNext, addedCameras, detectCodecs]);

  const handleSkip = useCallback(() => {
    onNext();
  }, [onNext]);

  return (
    <>
      <div className="flex flex-col gap-4 py-4">
        <div>
          <h2 className="text-xl font-semibold">
            {t("setupWizard.camera.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("setupWizard.camera.description")}
          </p>
        </div>

        {addedCameras.length > 0 && (
          <div className="flex flex-col gap-2">
            {addedCameras.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <span className="text-sm font-medium">{name}</span>
                <FaCircleCheck className="size-4 text-success" />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col items-center gap-3 py-4">
          <Button
            variant="select"
            className="w-full"
            onClick={() => setShowWizard(true)}
          >
            {addedCameras.length > 0
              ? t("setupWizard.camera.addAnother")
              : t("setupWizard.camera.addCamera")}
          </Button>
        </div>

        <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-4">
          <Button type="button" onClick={onBack}>
            {t("setupWizard.actions.back")}
          </Button>
          <div className="flex flex-1 justify-end gap-3">
            {addedCameras.length > 0 ? (
              <Button type="button" variant="select" onClick={handleNext}>
                {t("setupWizard.actions.next")}
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={handleSkip}>
                {t("setupWizard.actions.skip")}
              </Button>
            )}
          </div>
        </div>
      </div>
      <CameraWizardDialog
        open={showWizard}
        onClose={handleClose}
        onCameraAdded={handleCameraAdded}
      />
    </>
  );
}
