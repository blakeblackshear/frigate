import Heading from "@/components/ui/heading";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { toast } from "sonner";
import useSWR from "swr";
import axios from "axios";
import { FrigateConfig } from "@/types/frigateConfig";
import { CheckCircle2, XCircle } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LuExternalLink, LuFilter } from "react-icons/lu";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import {
  SettingsGroupCard,
  SplitCardRow,
} from "@/components/card/SettingsGroupCard";
import FrigatePlusCurrentModelSummary from "@/views/settings/components/FrigatePlusCurrentModelSummary";
import { useRestart } from "@/api/ws";
import RestartDialog from "@/components/overlay/dialog/RestartDialog";

type FrigatePlusModel = {
  id: string;
  type: string;
  name: string;
  isBaseModel: boolean;
  supportedDetectors: string[];
  trainDate: string;
  baseModel: string;
  width: number;
  height: number;
};

type FrigatePlusSettings = {
  model: {
    id?: string;
  };
};

type FrigateSettingsViewProps = {
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function FrigatePlusSettingsView({
  setUnsavedChanges,
}: FrigateSettingsViewProps) {
  const { t } = useTranslation("views/settings");
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const [changedValue, setChangedValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const { send: sendRestart } = useRestart();

  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  const [frigatePlusSettings, setFrigatePlusSettings] =
    useState<FrigatePlusSettings>({
      model: {
        id: undefined,
      },
    });

  const [origPlusSettings, setOrigPlusSettings] = useState<FrigatePlusSettings>(
    {
      model: {
        id: undefined,
      },
    },
  );

  const { data: availableModels = {}, isLoading: isLoadingModels } = useSWR<
    Record<string, FrigatePlusModel>
  >("/plus/models", {
    fallbackData: {},
    fetcher: async (url) => {
      const res = await axios.get(url, { withCredentials: true });
      return res.data.reduce(
        (obj: Record<string, FrigatePlusModel>, model: FrigatePlusModel) => {
          obj[model.id] = model;
          return obj;
        },
        {},
      );
    },
  });

  const [showBaseModels, setShowBaseModels] = useState(true);
  const [showFineTunedModels, setShowFineTunedModels] = useState(true);

  const filteredModelEntries = useMemo(
    () =>
      Object.entries(availableModels || {}).filter(([, model]) =>
        model.isBaseModel ? showBaseModels : showFineTunedModels,
      ),
    [availableModels, showBaseModels, showFineTunedModels],
  );

  const isFilterActive = !showBaseModels || !showFineTunedModels;

  useEffect(() => {
    if (config) {
      if (frigatePlusSettings?.model.id == undefined) {
        setFrigatePlusSettings({
          model: {
            id: config.model.plus?.id,
          },
        });
      }

      setOrigPlusSettings({
        model: {
          id: config.model.plus?.id,
        },
      });
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleFrigatePlusConfigChange = (
    newConfig: Partial<FrigatePlusSettings>,
  ) => {
    setFrigatePlusSettings((prevConfig) => ({
      model: {
        ...prevConfig.model,
        ...newConfig.model,
      },
    }));
    setUnsavedChanges(true);
    setChangedValue(true);
  };

  const saveToConfig = useCallback(async () => {
    setIsLoading(true);

    try {
      // Clear the existing model section so only the new path remains
      await axios.put("config/set", {
        requires_restart: 0,
        config_data: { model: null },
      });
      const res = await axios.put("config/set", {
        requires_restart: 0,
        config_data: {
          model: { path: `plus://${frigatePlusSettings.model.id}` },
        },
      });

      if (res.status === 200) {
        toast.success(t("frigatePlus.toast.success"), {
          position: "top-center",
          action: (
            <a onClick={() => setRestartDialogOpen(true)}>
              <Button>
                {t("restart.button", { ns: "components/dialog" })}
              </Button>
            </a>
          ),
        });
        setChangedValue(false);
        updateConfig();
      } else {
        toast.error(
          t("frigatePlus.toast.error", { errorMessage: res.statusText }),
          {
            position: "top-center",
          },
        );
      }
    } catch (error) {
      const err = error as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Unknown error";
      toast.error(t("toast.save.error.title", { errorMessage, ns: "common" }), {
        position: "top-center",
      });
    } finally {
      addMessage(
        "plus_restart",
        t("frigatePlus.restart_required"),
        undefined,
        "plus_restart",
      );
      setIsLoading(false);
    }
  }, [updateConfig, addMessage, frigatePlusSettings, t]);

  const onCancel = useCallback(() => {
    setFrigatePlusSettings(origPlusSettings);
    setChangedValue(false);
    removeMessage("plus_settings", "plus_settings");
  }, [origPlusSettings, removeMessage]);

  useEffect(() => {
    if (changedValue) {
      addMessage(
        "plus_settings",
        t("frigatePlus.unsavedChanges"),
        undefined,
        "plus_settings",
      );
    } else {
      removeMessage("plus_settings", "plus_settings");
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedValue]);

  useEffect(() => {
    document.title = t("documentTitle.frigatePlus");
  }, [t]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:pr-2">
      <Toaster position="top-center" closeButton={true} />
      <div className="w-full max-w-5xl space-y-6 pt-2">
        <div className="flex flex-col gap-0">
          <Heading as="h4" className="mb-2">
            {t("frigatePlus.title")}
          </Heading>

          <p className="text-sm text-muted-foreground">
            {t("frigatePlus.description")}
          </p>
        </div>

        <div className="space-y-6">
          <SettingsGroupCard title={t("frigatePlus.cardTitles.api")}>
            <SplitCardRow
              label={t("frigatePlus.apiKey.title")}
              description={
                <>
                  <p>{t("frigatePlus.apiKey.desc")}</p>
                  {!config?.model.plus && (
                    <div className="mt-2 flex items-center text-primary-variant">
                      <Link
                        to="https://frigate.video/plus"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline"
                      >
                        {t("frigatePlus.apiKey.plusLink")}
                        <LuExternalLink className="ml-2 inline-flex size-3" />
                      </Link>
                    </div>
                  )}
                </>
              }
              content={
                <div className="flex items-center gap-2">
                  {config?.plus?.enabled ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="text-sm">
                    {config?.plus?.enabled
                      ? t("frigatePlus.apiKey.validated")
                      : t("frigatePlus.apiKey.notValidated")}
                  </span>
                </div>
              }
            />
          </SettingsGroupCard>

          {config?.plus?.enabled && (
            <FrigatePlusCurrentModelSummary plusModel={config.model.plus} />
          )}

          {config?.plus?.enabled && (
            <SettingsGroupCard title={t("frigatePlus.cardTitles.otherModels")}>
              <SplitCardRow
                label={t("frigatePlus.modelInfo.availableModels")}
                description={
                  <Trans ns="views/settings">
                    frigatePlus.modelInfo.modelSelect
                  </Trans>
                }
                content={
                  <div className="flex w-full items-center gap-2">
                    <Select
                      value={frigatePlusSettings.model.id}
                      onValueChange={(value) =>
                        handleFrigatePlusConfigChange({
                          model: { id: value as string },
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        {frigatePlusSettings.model.id &&
                        availableModels?.[frigatePlusSettings.model.id]
                          ? new Date(
                              availableModels[
                                frigatePlusSettings.model.id
                              ].trainDate,
                            ).toLocaleString() +
                            " " +
                            availableModels[frigatePlusSettings.model.id]
                              .baseModel +
                            " (" +
                            (availableModels[frigatePlusSettings.model.id]
                              .isBaseModel
                              ? t(
                                  "frigatePlus.modelInfo.plusModelType.baseModel",
                                )
                              : t(
                                  "frigatePlus.modelInfo.plusModelType.userModel",
                                )) +
                            ") " +
                            availableModels[frigatePlusSettings.model.id].name +
                            " (" +
                            availableModels[frigatePlusSettings.model.id]
                              .width +
                            "x" +
                            availableModels[frigatePlusSettings.model.id]
                              .height +
                            ")"
                          : isLoadingModels
                            ? t("frigatePlus.modelInfo.loadingAvailableModels")
                            : t("frigatePlus.modelInfo.selectModel")}
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          {filteredModelEntries.length === 0 ? (
                            <div className="px-4 py-3 text-center text-sm text-muted-foreground">
                              {t("frigatePlus.modelInfo.noModelsAvailable")}
                            </div>
                          ) : (
                            filteredModelEntries.map(([id, model]) => (
                              <SelectItem
                                key={id}
                                className="cursor-pointer"
                                value={id}
                                disabled={
                                  !model.supportedDetectors.includes(
                                    Object.values(config.detectors)[0].type,
                                  )
                                }
                              >
                                {new Date(model.trainDate).toLocaleString()}{" "}
                                <div>
                                  {model.baseModel} {" ("}
                                  {model.isBaseModel
                                    ? t(
                                        "frigatePlus.modelInfo.plusModelType.baseModel",
                                      )
                                    : t(
                                        "frigatePlus.modelInfo.plusModelType.userModel",
                                      )}
                                  {")"}
                                </div>
                                <div>
                                  {model.name} (
                                  {model.width + "x" + model.height})
                                </div>
                                <div>
                                  {t(
                                    "frigatePlus.modelInfo.supportedDetectors",
                                  )}
                                  : {model.supportedDetectors.join(", ")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {id}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="focus:outline-none"
                          aria-label={t(
                            "frigatePlus.modelInfo.filter.ariaLabel",
                          )}
                        >
                          <LuFilter
                            className={cn(
                              "size-4",
                              isFilterActive
                                ? "text-selected"
                                : "text-secondary-foreground",
                            )}
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-56">
                        <div className="space-y-3">
                          <div className="text-sm text-primary-variant">
                            {t("frigatePlus.modelInfo.filter.ariaLabel")}
                          </div>
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="filterBaseModels"
                              className="cursor-pointer text-primary"
                            >
                              {t("frigatePlus.modelInfo.filter.baseModels")}
                            </Label>
                            <Switch
                              id="filterBaseModels"
                              checked={showBaseModels}
                              onCheckedChange={setShowBaseModels}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="filterFineTunedModels"
                              className="cursor-pointer text-primary"
                            >
                              {t(
                                "frigatePlus.modelInfo.filter.fineTunedModels",
                              )}
                            </Label>
                            <Switch
                              id="filterFineTunedModels"
                              checked={showFineTunedModels}
                              onCheckedChange={setShowFineTunedModels}
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                }
              />
            </SettingsGroupCard>
          )}

          <SettingsGroupCard title={t("frigatePlus.cardTitles.configuration")}>
            <SplitCardRow
              label={t("frigatePlus.snapshotConfig.title")}
              description={
                <>
                  <p>
                    <Trans ns="views/settings">
                      frigatePlus.snapshotConfig.desc
                    </Trans>
                  </p>
                  <div className="mt-2 flex items-center text-primary-variant">
                    <Link
                      to={getLocaleDocUrl("plus/faq")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      {t("readTheDocumentation", { ns: "common" })}
                      <LuExternalLink className="ml-2 inline-flex size-3" />
                    </Link>
                  </div>
                </>
              }
              content={
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-secondary">
                          <th className="px-4 py-2 text-left">
                            {t("frigatePlus.snapshotConfig.table.camera")}
                          </th>
                          <th className="px-4 py-2 text-center">
                            {t("frigatePlus.snapshotConfig.table.snapshots")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(config.cameras).map(
                          ([name, camera]) => (
                            <tr
                              key={name}
                              className="border-b border-secondary"
                            >
                              <td className="px-4 py-2">
                                <CameraNameLabel camera={name} />
                              </td>
                              <td className="px-4 py-2 text-center">
                                {camera.snapshots.enabled ? (
                                  <CheckCircle2 className="mx-auto size-5 text-green-500" />
                                ) : (
                                  <XCircle className="mx-auto size-5 text-danger" />
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              }
            />
          </SettingsGroupCard>
        </div>
      </div>

      <div className="sticky bottom-0 z-50 mt-6 w-full border-t border-secondary bg-background pt-0">
        <div
          className={cn(
            "flex flex-col items-center gap-4 pt-2 md:flex-row",
            changedValue ? "justify-between" : "justify-end",
          )}
        >
          {changedValue && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-unsaved">
                {t("unsavedChanges")}
              </span>
            </div>
          )}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            {changedValue && (
              <Button
                onClick={onCancel}
                variant="outline"
                disabled={isLoading}
                className="flex min-w-36 flex-1 gap-2"
              >
                {t("button.undo", { ns: "common" })}
              </Button>
            )}
            <Button
              onClick={saveToConfig}
              variant="select"
              disabled={!changedValue || isLoading}
              className="flex min-w-36 flex-1 gap-2"
            >
              {isLoading ? (
                <>
                  <ActivityIndicator className="h-4 w-4" />
                  {t("button.saving", { ns: "common" })}
                </>
              ) : (
                t("button.save", { ns: "common" })
              )}
            </Button>
          </div>
        </div>
      </div>
      <RestartDialog
        isOpen={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onRestart={() => sendRestart("restart")}
      />
    </div>
  );
}
