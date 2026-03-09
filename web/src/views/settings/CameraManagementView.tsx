import Heading from "@/components/ui/heading";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CONTROL_COLUMN_CLASS_NAME,
  SettingsGroupCard,
  SPLIT_ROW_CLASS_NAME,
} from "@/components/card/SettingsGroupCard";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useTranslation } from "react-i18next";
import CameraEditForm from "@/components/settings/CameraEditForm";
import CameraWizardDialog from "@/components/settings/CameraWizardDialog";
import DeleteCameraDialog from "@/components/overlay/dialog/DeleteCameraDialog";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { IoMdArrowRoundBack } from "react-icons/io";
import { isDesktop } from "react-device-detect";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { Switch } from "@/components/ui/switch";
import { Trans } from "react-i18next";
import { useEnabledState, useRestart } from "@/api/ws";
import { Label } from "@/components/ui/label";
import axios from "axios";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import RestartDialog from "@/components/overlay/dialog/RestartDialog";
import RestartRequiredIndicator from "@/components/indicators/RestartRequiredIndicator";
import type { ProfileState } from "@/types/profile";
import { getProfileColor } from "@/utils/profileColors";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CameraManagementViewProps = {
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  profileState?: ProfileState;
};

export default function CameraManagementView({
  setUnsavedChanges,
  profileState,
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // State for restart dialog when enabling a disabled camera
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const { send: sendRestart } = useRestart();

  // List of cameras for dropdown
  const enabledCameras = useMemo(() => {
    if (config) {
      return Object.keys(config.cameras)
        .filter((camera) => config.cameras[camera].enabled_in_config)
        .sort();
    }
    return [];
  }, [config]);

  const disabledCameras = useMemo(() => {
    if (config) {
      return Object.keys(config.cameras)
        .filter((camera) => !config.cameras[camera].enabled_in_config)
        .sort();
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
                <div className="flex gap-2">
                  <Button
                    variant="select"
                    onClick={() => setShowWizard(true)}
                    className="mb-2 flex max-w-48 items-center gap-2"
                  >
                    <LuPlus className="h-4 w-4" />
                    {t("cameraManagement.addCamera")}
                  </Button>
                  {enabledCameras.length + disabledCameras.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                      className="mb-2 flex max-w-48 items-center gap-2 text-white"
                    >
                      <LuTrash2 className="h-4 w-4" />
                      {t("cameraManagement.deleteCamera")}
                    </Button>
                  )}
                </div>

                {enabledCameras.length > 0 && (
                  <SettingsGroupCard
                    title={
                      <Trans ns="views/settings">
                        cameraManagement.streams.title
                      </Trans>
                    }
                  >
                    <div className={SPLIT_ROW_CLASS_NAME}>
                      <div className="space-y-1.5">
                        <Label
                          className="cursor-pointer"
                          htmlFor={"enabled-cameras-switch"}
                        >
                          {t("cameraManagement.streams.enableLabel")}
                          <p className="hidden text-sm text-muted-foreground md:block">
                            <Trans ns="views/settings">
                              cameraManagement.streams.enableDesc
                            </Trans>
                          </p>
                        </Label>
                      </div>
                      <div className="max-w-md space-y-2 rounded-lg bg-secondary p-4">
                        {enabledCameras.map((camera) => (
                          <div
                            key={camera}
                            className="flex flex-row items-center justify-between"
                          >
                            <CameraNameLabel camera={camera} />
                            <CameraEnableSwitch cameraName={camera} />
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground md:hidden">
                        <Trans ns="views/settings">
                          cameraManagement.streams.enableDesc
                        </Trans>
                      </p>
                    </div>
                    {disabledCameras.length > 0 && (
                      <div className={SPLIT_ROW_CLASS_NAME}>
                        <div className="space-y-1.5">
                          <Label
                            className="cursor-pointer"
                            htmlFor={"disabled-cameras-switch"}
                          >
                            {t("cameraManagement.streams.disableLabel")}
                            <RestartRequiredIndicator className="ml-1" />
                          </Label>
                          <p className="hidden text-sm text-muted-foreground md:block">
                            {t("cameraManagement.streams.disableDesc")}
                          </p>
                        </div>
                        <div
                          className={`${CONTROL_COLUMN_CLASS_NAME} space-y-1.5`}
                        >
                          <div className="max-w-md space-y-2 rounded-lg bg-secondary p-4">
                            {disabledCameras.map((camera) => (
                              <div
                                key={camera}
                                className="flex flex-row items-center justify-between"
                              >
                                <CameraNameLabel camera={camera} />
                                <CameraConfigEnableSwitch
                                  cameraName={camera}
                                  onConfigChanged={updateConfig}
                                  setRestartDialogOpen={setRestartDialogOpen}
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground md:hidden">
                            {t("cameraManagement.streams.disableDesc")}
                          </p>
                        </div>
                      </div>
                    )}
                  </SettingsGroupCard>
                )}

                {profileState &&
                  profileState.allProfileNames.length > 0 &&
                  enabledCameras.length > 0 && (
                    <ProfileCameraEnableSection
                      profileState={profileState}
                      cameras={enabledCameras}
                      config={config}
                      onConfigChanged={updateConfig}
                    />
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
      <DeleteCameraDialog
        show={showDeleteDialog}
        cameras={[...enabledCameras, ...disabledCameras]}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => {
          setShowDeleteDialog(false);
          updateConfig();
        }}
      />
      <RestartDialog
        isOpen={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onRestart={() => sendRestart("restart")}
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

type CameraConfigEnableSwitchProps = {
  cameraName: string;
  setRestartDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onConfigChanged: () => Promise<unknown>;
};

function CameraConfigEnableSwitch({
  cameraName,
  onConfigChanged,
  setRestartDialogOpen,
}: CameraConfigEnableSwitchProps) {
  const { t } = useTranslation([
    "common",
    "views/settings",
    "components/dialog",
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const onCheckedChange = useCallback(
    async (isChecked: boolean) => {
      if (!isChecked || isSaving) {
        return;
      }

      setIsSaving(true);

      try {
        await axios.put("config/set", {
          requires_restart: 1,
          config_data: {
            cameras: {
              [cameraName]: {
                enabled: true,
              },
            },
          },
        });

        await onConfigChanged();

        toast.success(
          t("cameraManagement.streams.enableSuccess", {
            ns: "views/settings",
            cameraName,
          }),
          {
            position: "top-center",
            action: (
              <a onClick={() => setRestartDialogOpen(true)}>
                <Button>
                  {t("restart.button", { ns: "components/dialog" })}
                </Button>
              </a>
            ),
          },
        );
      } catch (error) {
        const errorMessage =
          axios.isAxiosError(error) &&
          (error.response?.data?.message || error.response?.data?.detail)
            ? error.response?.data?.message || error.response?.data?.detail
            : t("toast.save.error.noMessage", { ns: "common" });

        toast.error(
          t("toast.save.error.title", { errorMessage, ns: "common" }),
          {
            position: "top-center",
          },
        );
      } finally {
        setIsSaving(false);
      }
    },
    [cameraName, isSaving, onConfigChanged, setRestartDialogOpen, t],
  );

  return (
    <div className="flex flex-row items-center">
      {isSaving ? (
        <ActivityIndicator className="h-5 w-8" size={16} />
      ) : (
        <Switch
          id={`camera-enabled-${cameraName}`}
          checked={false}
          onCheckedChange={onCheckedChange}
        />
      )}
    </div>
  );
}

type ProfileCameraEnableSectionProps = {
  profileState: ProfileState;
  cameras: string[];
  config: FrigateConfig | undefined;
  onConfigChanged: () => Promise<unknown>;
};

function ProfileCameraEnableSection({
  profileState,
  cameras,
  config,
  onConfigChanged,
}: ProfileCameraEnableSectionProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const [selectedProfile, setSelectedProfile] = useState<string>(
    profileState.allProfileNames[0] ?? "",
  );
  const [savingCamera, setSavingCamera] = useState<string | null>(null);
  // Optimistic local state: the parsed config API doesn't reflect profile
  // enabled changes until Frigate restarts, so we track saved values locally.
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, Record<string, string>>
  >({});

  const handleEnabledChange = useCallback(
    async (camera: string, value: string) => {
      setSavingCamera(camera);
      try {
        const enabledValue =
          value === "enabled" ? true : value === "disabled" ? false : null;
        const configData =
          enabledValue === null
            ? {
                cameras: {
                  [camera]: {
                    profiles: { [selectedProfile]: { enabled: "" } },
                  },
                },
              }
            : {
                cameras: {
                  [camera]: {
                    profiles: { [selectedProfile]: { enabled: enabledValue } },
                  },
                },
              };

        await axios.put("config/set", { config_data: configData });
        await onConfigChanged();

        setLocalOverrides((prev) => ({
          ...prev,
          [selectedProfile]: {
            ...prev[selectedProfile],
            [camera]: value,
          },
        }));

        toast.success(t("toast.save.success", { ns: "common" }), {
          position: "top-center",
        });
      } catch {
        toast.error(t("toast.save.error.title", { ns: "common" }), {
          position: "top-center",
        });
      } finally {
        setSavingCamera(null);
      }
    },
    [selectedProfile, onConfigChanged, t],
  );

  const getEnabledState = useCallback(
    (camera: string): string => {
      // Check optimistic local state first
      const localValue = localOverrides[selectedProfile]?.[camera];
      if (localValue) return localValue;

      const profileData =
        config?.cameras?.[camera]?.profiles?.[selectedProfile];
      if (!profileData || profileData.enabled === undefined) return "inherit";
      return profileData.enabled ? "enabled" : "disabled";
    },
    [config, selectedProfile, localOverrides],
  );

  const profileColor = selectedProfile
    ? getProfileColor(selectedProfile, profileState.allProfileNames)
    : null;

  if (!selectedProfile) return null;

  return (
    <SettingsGroupCard
      title={t("cameraManagement.profiles.title", {
        ns: "views/settings",
      })}
    >
      <div className={SPLIT_ROW_CLASS_NAME}>
        <div className="space-y-1.5">
          <Label>
            {t("cameraManagement.profiles.selectLabel", {
              ns: "views/settings",
            })}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("cameraManagement.profiles.description", {
              ns: "views/settings",
            })}
          </p>
        </div>
        <div className={`${CONTROL_COLUMN_CLASS_NAME} space-y-4`}>
          <Select value={selectedProfile} onValueChange={setSelectedProfile}>
            <SelectTrigger className="w-full max-w-[200px]">
              <div className="flex items-center gap-2">
                {profileColor && (
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      profileColor.dot,
                    )}
                  />
                )}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {profileState.allProfileNames.map((profile) => {
                const color = getProfileColor(
                  profile,
                  profileState.allProfileNames,
                );
                return (
                  <SelectItem key={profile} value={profile}>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          color.dot,
                        )}
                      />
                      {profile}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <div className="max-w-md space-y-2 rounded-lg bg-secondary p-4">
            {cameras.map((camera) => {
              const state = getEnabledState(camera);
              const isSaving = savingCamera === camera;

              return (
                <div
                  key={camera}
                  className="flex flex-row items-center justify-between"
                >
                  <CameraNameLabel camera={camera} />
                  {isSaving ? (
                    <ActivityIndicator className="h-5 w-20" size={16} />
                  ) : (
                    <Select
                      value={state}
                      onValueChange={(v) => handleEnabledChange(camera, v)}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">
                          {t("cameraManagement.profiles.inherit", {
                            ns: "views/settings",
                          })}
                        </SelectItem>
                        <SelectItem value="enabled">
                          {t("cameraManagement.profiles.enabled", {
                            ns: "views/settings",
                          })}
                        </SelectItem>
                        <SelectItem value="disabled">
                          {t("cameraManagement.profiles.disabled", {
                            ns: "views/settings",
                          })}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SettingsGroupCard>
  );
}
