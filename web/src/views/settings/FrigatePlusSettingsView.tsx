import Heading from "@/components/ui/heading";
import { useCallback, useContext, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { toast } from "sonner";
import useSWR from "swr";
import axios from "axios";
import { FrigateConfig } from "@/types/frigateConfig";
import { CheckCircle2, XCircle } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { IoIosWarning } from "react-icons/io";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import {
  SettingsGroupCard,
  SplitCardRow,
} from "@/components/card/SettingsGroupCard";
import FrigatePlusCurrentModelSummary from "@/views/settings/components/FrigatePlusCurrentModelSummary";

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

  const { data: availableModels = {} } = useSWR<
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

    axios
      .put(`config/set?model.path=plus://${frigatePlusSettings.model.id}`, {
        requires_restart: 0,
      })
      .then((res) => {
        if (res.status === 200) {
          toast.success(t("frigatePlus.toast.success"), {
            position: "top-center",
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
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("toast.save.error.title", { errorMessage, ns: "common" }),
          {
            position: "top-center",
          },
        );
      })
      .finally(() => {
        addMessage(
          "plus_restart",
          t("frigatePlus.restart_required"),
          undefined,
          "plus_restart",
        );
        setIsLoading(false);
      });
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

  const needCleanSnapshots = () => {
    if (!config) {
      return false;
    }
    return Object.values(config.cameras).some(
      (camera) => camera.snapshots.enabled && !camera.snapshots.clean_copy,
    );
  };

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="mt-2 flex h-full w-full flex-col">
        <div className="scrollbar-container flex-1 overflow-y-auto">
          <div className="w-full max-w-5xl space-y-6">
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

              {config?.model.plus && (
                <FrigatePlusCurrentModelSummary plusModel={config.model.plus} />
              )}

              {config?.model.plus && (
                <SettingsGroupCard
                  title={t("frigatePlus.cardTitles.otherModels")}
                >
                  <SplitCardRow
                    label={t("frigatePlus.modelInfo.availableModels")}
                    description={
                      <Trans ns="views/settings">
                        frigatePlus.modelInfo.modelSelect
                      </Trans>
                    }
                    content={
                      <Select
                        value={frigatePlusSettings.model.id}
                        onValueChange={(value) =>
                          handleFrigatePlusConfigChange({
                            model: { id: value as string },
                          })
                        }
                      >
                        {frigatePlusSettings.model.id &&
                        availableModels?.[frigatePlusSettings.model.id] ? (
                          <SelectTrigger className="w-full">
                            {new Date(
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
                              availableModels[frigatePlusSettings.model.id]
                                .name +
                              " (" +
                              availableModels[frigatePlusSettings.model.id]
                                .width +
                              "x" +
                              availableModels[frigatePlusSettings.model.id]
                                .height +
                              ")"}
                          </SelectTrigger>
                        ) : (
                          <SelectTrigger className="w-full">
                            {t("frigatePlus.modelInfo.loadingAvailableModels")}
                          </SelectTrigger>
                        )}

                        <SelectContent>
                          <SelectGroup>
                            {Object.entries(availableModels || {}).map(
                              ([id, model]) => (
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
                              ),
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    }
                  />
                </SettingsGroupCard>
              )}

              <SettingsGroupCard
                title={t("frigatePlus.cardTitles.configuration")}
              >
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
                                {t(
                                  "frigatePlus.snapshotConfig.table.snapshots",
                                )}
                              </th>
                              <th className="px-4 py-2 text-center">
                                <Trans ns="views/settings">
                                  frigatePlus.snapshotConfig.table.cleanCopySnapshots
                                </Trans>
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
                                  <td className="px-4 py-2 text-center">
                                    {camera.snapshots?.enabled &&
                                    camera.snapshots?.clean_copy ? (
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
                      {needCleanSnapshots() && (
                        <div className="rounded-lg border border-secondary-foreground bg-secondary p-4 text-sm text-danger">
                          <div className="flex items-center gap-2">
                            <IoIosWarning className="mr-2 size-5 text-danger" />
                            <div className="max-w-[85%] text-sm">
                              <Trans ns="views/settings">
                                frigatePlus.snapshotConfig.cleanCopyWarning
                              </Trans>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  }
                />
              </SettingsGroupCard>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-50 w-full border-t border-secondary bg-background pb-5 pt-0 md:pr-2">
          <div className="flex flex-col items-center gap-4 pt-2 md:flex-row md:justify-end">
            <div className="flex w-full items-center gap-2 md:w-auto">
              <Button
                className="flex min-w-36 flex-1 gap-2"
                variant="outline"
                aria-label={t("button.reset", { ns: "common" })}
                onClick={onCancel}
              >
                {t("button.reset", { ns: "common" })}
              </Button>
              <Button
                variant="select"
                disabled={!changedValue || isLoading}
                className="flex min-w-36 flex-1 gap-2"
                aria-label={t("button.save", { ns: "common" })}
                onClick={saveToConfig}
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
      </div>
    </div>
  );
}
