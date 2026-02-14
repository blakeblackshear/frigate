import Heading from "@/components/ui/heading";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsGroupCard } from "@/components/card/SettingsGroupCard";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useTranslation } from "react-i18next";
import CameraEditForm from "@/components/settings/CameraEditForm";
import CameraWizardDialog from "@/components/settings/CameraWizardDialog";
import { LuPlus } from "react-icons/lu";
import { IoMdArrowRoundBack } from "react-icons/io";
import { isDesktop } from "react-device-detect";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { Switch } from "@/components/ui/switch";
import { Trans } from "react-i18next";
import { useEnabledState } from "@/api/ws";

type CameraManagementViewProps = {
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function CameraManagementView({
  setUnsavedChanges,
}: CameraManagementViewProps) {
  const { t } = useTranslation(["views/settings"]);

  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const [viewMode, setViewMode] = useState<"settings" | "add" | "edit">(
    "settings",
  ); // Control view state
  const [editCameraName, setEditCameraName] = useState<string | undefined>(
    undefined,
  ); // Track camera being edited
  const [showWizard, setShowWizard] = useState(false);

  // List of cameras for dropdown
  const cameras = useMemo(() => {
    if (config) {
      return Object.keys(config.cameras).sort();
    }
    return [];
  }, [config]);

  useEffect(() => {
    document.title = t("documentTitle.cameraManagement");
  }, [t]);

  // Handle back navigation from add/edit form
  const handleBack = useCallback(() => {
    setViewMode("settings");
    setEditCameraName(undefined);
    setUnsavedChanges(false);
    updateConfig();
  }, [updateConfig, setUnsavedChanges]);

  return (
    <>
      <Toaster
        richColors
        className="z-[1000]"
        position="top-center"
        closeButton
      />
      <div className="flex size-full space-y-6">
        <div className="scrollbar-container flex-1 overflow-y-auto pb-2">
          {viewMode === "settings" ? (
            <>
              <Heading as="h4" className="mb-6">
                {t("cameraManagement.title")}
              </Heading>

              <div className="w-full max-w-5xl space-y-6">
                <Button
                  variant="select"
                  onClick={() => setShowWizard(true)}
                  className="mb-2 flex max-w-48 items-center gap-2"
                >
                  <LuPlus className="h-4 w-4" />
                  {t("cameraManagement.addCamera")}
                </Button>

                {cameras.length > 0 && (
                  <SettingsGroupCard
                    title={
                      <Trans ns="views/settings">
                        cameraManagement.streams.title
                      </Trans>
                    }
                  >
                    <div className="space-y-4">
                      <div className="max-w-md text-sm text-muted-foreground">
                        <Trans ns="views/settings">
                          cameraManagement.streams.desc
                        </Trans>
                      </div>
                      <div className="max-w-md space-y-2 rounded-lg bg-secondary p-4">
                        {cameras.map((camera) => (
                          <div
                            key={camera}
                            className="flex flex-row items-center justify-between"
                          >
                            <CameraNameLabel camera={camera} />
                            <CameraEnableSwitch cameraName={camera} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </SettingsGroupCard>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <Button
                  className={`flex items-center gap-2.5 rounded-lg`}
                  aria-label={t("label.back", { ns: "common" })}
                  size="sm"
                  onClick={handleBack}
                >
                  <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
                  {isDesktop && (
                    <div className="text-primary">
                      {t("button.back", { ns: "common" })}
                    </div>
                  )}
                </Button>
              </div>
              <div className="md:max-w-5xl">
                <CameraEditForm
                  cameraName={viewMode === "edit" ? editCameraName : undefined}
                  onSave={handleBack}
                  onCancel={handleBack}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <CameraWizardDialog
        open={showWizard}
        onClose={() => setShowWizard(false)}
      />
    </>
  );
}

type CameraEnableSwitchProps = {
  cameraName: string;
};

function CameraEnableSwitch({ cameraName }: CameraEnableSwitchProps) {
  const { payload: enabledState, send: sendEnabled } =
    useEnabledState(cameraName);

  return (
    <div className="flex flex-row items-center">
      <Switch
        id={`camera-enabled-${cameraName}`}
        checked={enabledState === "ON"}
        onCheckedChange={(isChecked) => {
          sendEnabled(isChecked ? "ON" : "OFF");
        }}
      />
    </div>
  );
}
