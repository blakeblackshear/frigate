import Heading from "@/components/ui/heading";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  LuCheck,
  LuExternalLink,
  LuGripVertical,
  LuPencil,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import { Reorder, useDragControls } from "framer-motion";
import { IoMdArrowRoundBack } from "react-icons/io";
import { Link } from "react-router-dom";
import { useDocDomain } from "@/hooks/use-doc-domain";
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
import TextEntryDialog from "@/components/overlay/dialog/TextEntryDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProfileState } from "@/types/profile";
import { getProfileColor } from "@/utils/profileColors";
import { isReplayCamera } from "@/utils/cameraUtil";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REORDER_SAVED_INDICATOR_MS = 1500;

type ReorderSaveStatus = "idle" | "saving" | "saved";

type CameraManagementViewProps = {
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  profileState?: ProfileState;
};

export default function CameraManagementView({
  setUnsavedChanges,
  profileState,
}: CameraManagementViewProps) {
  const { t } = useTranslation(["views/settings", "common"]);

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

  const enabledCameras = useMemo(() => {
    if (config) {
      return Object.keys(config.cameras)
        .filter(
          (camera) =>
            config.cameras[camera].enabled_in_config && !isReplayCamera(camera),
        )
        .sort((a, b) => {
          const orderA = config.cameras[a].ui?.order ?? 0;
          const orderB = config.cameras[b].ui?.order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.localeCompare(b);
        });
    }
    return [];
  }, [config]);

  // Diverges from config during a drag and while the save is in flight.
  const [orderedCameras, setOrderedCameras] =
    useState<string[]>(enabledCameras);
  const orderedCamerasRef = useRef(orderedCameras);
  useEffect(() => {
    orderedCamerasRef.current = orderedCameras;
  }, [orderedCameras]);

  useEffect(() => {
    setOrderedCameras((prev) => {
      if (
        prev.length === enabledCameras.length &&
        prev.every((cam, i) => cam === enabledCameras[i])
      ) {
        return prev;
      }
      return enabledCameras;
    });
  }, [enabledCameras]);

  const [reorderSaveStatus, setReorderSaveStatus] =
    useState<ReorderSaveStatus>("idle");
  const reorderSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  useEffect(() => {
    return () => {
      if (reorderSavedTimerRef.current) {
        clearTimeout(reorderSavedTimerRef.current);
      }
    };
  }, []);

  const handleReorderDragEnd = useCallback(async () => {
    const current = orderedCamerasRef.current;
    if (
      current.length === enabledCameras.length &&
      current.every((cam, i) => cam === enabledCameras[i])
    ) {
      return;
    }

    const cameraUpdates: Record<string, { ui: { order: number } }> = {};
    current.forEach((cam, i) => {
      cameraUpdates[cam] = { ui: { order: i * 10 } };
    });

    if (reorderSavedTimerRef.current) {
      clearTimeout(reorderSavedTimerRef.current);
      reorderSavedTimerRef.current = null;
    }
    setReorderSaveStatus("saving");

    try {
      await axios.put("config/set", {
        requires_restart: 0,
        config_data: { cameras: cameraUpdates },
      });
      await updateConfig();
      setReorderSaveStatus("saved");
      reorderSavedTimerRef.current = setTimeout(() => {
        setReorderSaveStatus("idle");
        reorderSavedTimerRef.current = null;
      }, REORDER_SAVED_INDICATOR_MS);
    } catch (error) {
      setOrderedCameras(enabledCameras);
      setReorderSaveStatus("idle");
      const errorMessage =
        axios.isAxiosError(error) &&
        (error.response?.data?.message || error.response?.data?.detail)
          ? error.response?.data?.message || error.response?.data?.detail
          : t("toast.save.error.noMessage", { ns: "common" });

      toast.error(t("toast.save.error.title", { errorMessage, ns: "common" }), {
        position: "top-center",
      });
    }
  }, [enabledCameras, updateConfig, t]);

  const disabledCameras = useMemo(() => {
    if (config) {
      return Object.keys(config.cameras)
        .filter(
          (camera) =>
            !config.cameras[camera].enabled_in_config &&
            !isReplayCamera(camera),
        )
        .sort();
    }
    return [];
  }, [config]);

  const allCameras = useMemo(() => {
    if (config) {
      return Object.keys(config.cameras)
        .filter((camera) => !isReplayCamera(camera))
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
              <Heading as="h4" className="mb-2">
                {t("cameraManagement.title")}
              </Heading>
              <p className="mb-6 max-w-5xl text-sm text-muted-foreground">
                {t("cameraManagement.description")}
              </p>

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
                      <div className="max-w-md space-y-1.5">
                        <Reorder.Group
                          as="div"
                          axis="y"
                          values={orderedCameras}
                          onReorder={setOrderedCameras}
                          className="space-y-2 rounded-lg bg-secondary p-4"
                        >
                          {orderedCameras.map((camera) => (
                            <EnabledCameraRow
                              key={camera}
                              camera={camera}
                              onConfigChanged={updateConfig}
                              onDragEnd={handleReorderDragEnd}
                            />
                          ))}
                        </Reorder.Group>
                        <ReorderSaveStatusIndicator
                          status={reorderSaveStatus}
                        />
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

                {config?.lpr?.enabled && allCameras.length > 0 && (
                  <CameraTypeSection
                    cameras={allCameras}
                    config={config}
                    onConfigChanged={updateConfig}
                    setRestartDialogOpen={setRestartDialogOpen}
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

type ReorderSaveStatusIndicatorProps = {
  status: ReorderSaveStatus;
};

function ReorderSaveStatusIndicator({
  status,
}: ReorderSaveStatusIndicatorProps) {
  const { t } = useTranslation(["views/settings"]);
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex h-4 items-center justify-start gap-1 text-xs transition-opacity duration-200",
        status === "idle" ? "opacity-0" : "opacity-100",
      )}
    >
      {status === "saving" && (
        <span className="text-muted-foreground">
          {t("cameraManagement.streams.saving")}
        </span>
      )}
      {status === "saved" && (
        <span className="flex items-center gap-1 text-success">
          <LuCheck className="size-3.5" />
          {t("cameraManagement.streams.saved")}
        </span>
      )}
    </div>
  );
}

type EnabledCameraRowProps = {
  camera: string;
  onConfigChanged: () => Promise<unknown>;
  onDragEnd: () => void;
};

function EnabledCameraRow({
  camera,
  onConfigChanged,
  onDragEnd,
}: EnabledCameraRowProps) {
  const { t } = useTranslation(["views/settings"]);
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={camera}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="flex flex-row items-center justify-between"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="-ml-1 cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-primary active:cursor-grabbing"
          aria-label={t("cameraManagement.streams.reorderHandle")}
        >
          <LuGripVertical className="size-4" />
        </button>
        <CameraNameLabel camera={camera} />
        <CameraFriendlyNameEditor
          cameraName={camera}
          onConfigChanged={onConfigChanged}
        />
      </div>
      <CameraEnableSwitch cameraName={camera} />
    </Reorder.Item>
  );
}

type CameraEnableSwitchProps = {
  cameraName: string;
};

function CameraEnableSwitch({ cameraName }: CameraEnableSwitchProps) {
  const { payload: enabledState, send: sendEnabled } =
    useEnabledState(cameraName);
  const { data: config } = useSWR<FrigateConfig>("config");

  const isChecked =
    enabledState === "ON" || enabledState === "OFF"
      ? enabledState === "ON"
      : (config?.cameras?.[cameraName]?.enabled ?? false);

  return (
    <div className="flex flex-row items-center">
      <Switch
        id={`camera-enabled-${cameraName}`}
        checked={isChecked}
        onCheckedChange={(isChecked) => {
          sendEnabled(isChecked ? "ON" : "OFF");
        }}
      />
    </div>
  );
}

type CameraFriendlyNameEditorProps = {
  cameraName: string;
  onConfigChanged: () => Promise<unknown>;
};

function CameraFriendlyNameEditor({
  cameraName,
  onConfigChanged,
}: CameraFriendlyNameEditorProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentFriendlyName = config?.cameras?.[cameraName]?.friendly_name;

  const onSave = useCallback(
    async (text: string) => {
      if (isSaving) return;
      setIsSaving(true);

      try {
        await axios.put("config/set", {
          requires_restart: 0,
          config_data: {
            cameras: {
              [cameraName]: {
                friendly_name: text.trim() || null,
              },
            },
          },
        });

        await onConfigChanged();
        setOpen(false);

        toast.success(t("toast.save.success", { ns: "common" }), {
          position: "top-center",
        });
      } catch (error) {
        const errorMessage =
          axios.isAxiosError(error) &&
          (error.response?.data?.message || error.response?.data?.detail)
            ? error.response?.data?.message || error.response?.data?.detail
            : t("toast.save.error.noMessage", { ns: "common" });

        toast.error(
          t("toast.save.error.title", { errorMessage, ns: "common" }),
          { position: "top-center" },
        );
      } finally {
        setIsSaving(false);
      }
    },
    [cameraName, isSaving, onConfigChanged, t],
  );

  const renameLabel = t("cameraManagement.streams.friendlyName.rename", {
    ns: "views/settings",
  });

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={renameLabel}
            onClick={() => setOpen(true)}
            disabled={isSaving}
          >
            <LuPencil className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{renameLabel}</TooltipContent>
      </Tooltip>
      <TextEntryDialog
        open={open}
        setOpen={setOpen}
        title={t("cameraManagement.streams.friendlyName.title", {
          ns: "views/settings",
        })}
        description={t("cameraManagement.streams.friendlyName.description", {
          ns: "views/settings",
        })}
        defaultValue={currentFriendlyName ?? ""}
        placeholder={currentFriendlyName ? undefined : cameraName}
        allowEmpty
        isSaving={isSaving}
        onSave={onSave}
      />
    </>
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

type CameraTypeSectionProps = {
  cameras: string[];
  config: FrigateConfig | undefined;
  onConfigChanged: () => Promise<unknown>;
  setRestartDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

function CameraTypeSection({
  cameras,
  config,
  onConfigChanged,
  setRestartDialogOpen,
}: CameraTypeSectionProps) {
  const { t } = useTranslation([
    "views/settings",
    "common",
    "components/dialog",
  ]);
  const { getLocaleDocUrl } = useDocDomain();
  const [savingCamera, setSavingCamera] = useState<string | null>(null);
  // Optimistic local state: the parsed config API doesn't reflect type
  // changes until Frigate restarts, so we track saved values locally.
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>(
    {},
  );

  const handleTypeChange = useCallback(
    async (camera: string, value: string) => {
      setSavingCamera(camera);
      try {
        const typeValue = value === "lpr" ? "lpr" : null;
        await axios.put("config/set", {
          requires_restart: 1,
          config_data: {
            cameras: {
              [camera]: {
                type: typeValue,
              },
            },
          },
        });
        await onConfigChanged();

        setLocalOverrides((prev) => ({
          ...prev,
          [camera]: value,
        }));

        toast.success(
          t("cameraManagement.cameraType.saveSuccess", {
            ns: "views/settings",
            cameraName: camera,
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
          { position: "top-center" },
        );
      } finally {
        setSavingCamera(null);
      }
    },
    [onConfigChanged, setRestartDialogOpen, t],
  );

  const getCameraType = useCallback(
    (camera: string): string => {
      const localValue = localOverrides[camera];
      if (localValue) return localValue;

      const type = config?.cameras?.[camera]?.type;
      return type === "lpr" ? "lpr" : "normal";
    },
    [config, localOverrides],
  );

  return (
    <SettingsGroupCard
      title={t("cameraManagement.cameraType.title", {
        ns: "views/settings",
      })}
    >
      <div className={SPLIT_ROW_CLASS_NAME}>
        <div className="space-y-1.5">
          <Label>
            {t("cameraManagement.cameraType.label", {
              ns: "views/settings",
            })}
            <RestartRequiredIndicator className="ml-1" />
          </Label>
          <p className="hidden text-sm text-muted-foreground md:block">
            {t("cameraManagement.cameraType.description", {
              ns: "views/settings",
            })}
          </p>
          <div className="hidden items-center text-sm text-primary md:flex">
            <Link
              to={getLocaleDocUrl(
                "configuration/license_plate_recognition#dedicated-lpr-cameras",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline"
            >
              {t("readTheDocumentation", { ns: "common" })}
              <LuExternalLink className="ml-2 inline-flex size-3" />
            </Link>
          </div>
        </div>
        <div className={`${CONTROL_COLUMN_CLASS_NAME} space-y-1.5`}>
          <div className="max-w-md space-y-2 rounded-lg bg-secondary p-4">
            {cameras.map((camera) => {
              const currentType = getCameraType(camera);
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
                      value={currentType}
                      onValueChange={(v) => handleTypeChange(camera, v)}
                    >
                      <SelectTrigger className="h-7 w-full max-w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">
                          {t("cameraManagement.cameraType.normal", {
                            ns: "views/settings",
                          })}
                        </SelectItem>
                        <SelectItem value="lpr">
                          {t("cameraManagement.cameraType.dedicatedLpr", {
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
          <p className="text-sm text-muted-foreground md:hidden">
            {t("cameraManagement.cameraType.description", {
              ns: "views/settings",
            })}
          </p>
          <div className="flex items-center text-sm text-primary md:hidden">
            <Link
              to={getLocaleDocUrl(
                "configuration/license_plate_recognition#dedicated-lpr-cameras",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline"
            >
              {t("readTheDocumentation", { ns: "common" })}
              <LuExternalLink className="ml-2 inline-flex size-3" />
            </Link>
          </div>
        </div>
      </div>
    </SettingsGroupCard>
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

        await axios.put("config/set", {
          requires_restart: 0,
          config_data: configData,
        });
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
              <SelectValue />
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
                      {profileState.profileFriendlyNames.get(profile) ??
                        profile}
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
