import Heading from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { useCallback, useContext, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Separator } from "../../components/ui/separator";
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
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto pb-2 md:order-none">
          <Heading as="h4" className="mb-2">
            {t("frigatePlus.title")}
          </Heading>

          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            {t("frigatePlus.apiKey.title")}
          </Heading>

          <div className="mt-2 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {config?.plus?.enabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <Label>
                  {config?.plus?.enabled
                    ? t("frigatePlus.apiKey.validated")
                    : t("frigatePlus.apiKey.notValidated")}
                </Label>
              </div>
              <div className="my-2 max-w-5xl text-sm text-muted-foreground">
                <p>{t("frigatePlus.apiKey.desc")}</p>
                {!config?.model.plus && (
                  <>
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
                  </>
                )}
              </div>
            </div>

            {config?.model.plus && (
              <>
                <Separator className="my-2 flex bg-secondary" />
                <div className="mt-2 max-w-2xl">
                  <Heading as="h4" className="my-2">
                    {t("frigatePlus.modelInfo.title")}
                  </Heading>
                  <div className="mt-2 space-y-3">
                    {!config?.model?.plus && (
                      <p className="text-muted-foreground">
                        {t("frigatePlus.modelInfo.loading")}
                      </p>
                    )}
                    {config?.model?.plus === null && (
                      <p className="text-danger">
                        {t("frigatePlus.modelInfo.error")}
                      </p>
                    )}
                    {config?.model?.plus && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">
                            {t("frigatePlus.modelInfo.baseModel")}
                          </Label>
                          <p>
                            {config.model.plus.baseModel} (
                            {config.model.plus.isBaseModel
                              ? t(
                                  "frigatePlus.modelInfo.plusModelType.baseModel",
                                )
                              : t(
                                  "frigatePlus.modelInfo.plusModelType.userModel",
                                )}
                            )
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            {t("frigatePlus.modelInfo.trainDate")}
                          </Label>
                          <p>
                            {new Date(
                              config.model.plus.trainDate,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            {t("frigatePlus.modelInfo.modelType")}
                          </Label>
                          <p>
                            {config.model.plus.name} (
                            {config.model.plus.width +
                              "x" +
                              config.model.plus.height}
                            )
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            {t("frigatePlus.modelInfo.supportedDetectors")}
                          </Label>
                          <p>
                            {config.model.plus.supportedDetectors.join(", ")}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <div className="space-y-2">
                            <div className="text-md">
                              {t("frigatePlus.modelInfo.availableModels")}
                            </div>
                            <div className="space-y-3 text-sm text-muted-foreground">
                              <p>
                                <Trans ns="views/settings">
                                  frigatePlus.modelInfo.modelSelect
                                </Trans>
                              </p>
                            </div>
                          </div>
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
                              <SelectTrigger>
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
                              <SelectTrigger>
                                {t(
                                  "frigatePlus.modelInfo.loadingAvailableModels",
                                )}
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
                                          Object.values(config.detectors)[0]
                                            .type,
                                        )
                                      }
                                    >
                                      {new Date(
                                        model.trainDate,
                                      ).toLocaleString()}{" "}
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
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator className="my-2 flex bg-secondary" />

            <div className="mt-2 max-w-5xl">
              <Heading as="h4" className="my-2">
                {t("frigatePlus.snapshotConfig.title")}
              </Heading>
              <div className="mt-2 space-y-3">
                <div className="my-2 text-sm text-muted-foreground">
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
                </div>
                {config && (
                  <div className="overflow-x-auto">
                    <table className="max-w-2xl text-sm">
                      <thead>
                        <tr className="border-b border-secondary">
                          <th className="px-4 py-2 text-left">
                            {t("frigatePlus.snapshotConfig.table.camera")}
                          </th>
                          <th className="px-4 py-2 text-center">
                            {t("frigatePlus.snapshotConfig.table.snapshots")}
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
                )}
                {needCleanSnapshots() && (
                  <div className="mt-2 max-w-xl rounded-lg border border-secondary-foreground bg-secondary p-4 text-sm text-danger">
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
            </div>

            <Separator className="my-2 flex bg-secondary" />

            <div className="flex w-full flex-row items-center gap-2 pt-2 md:w-[25%]">
              <Button
                className="flex flex-1"
                aria-label={t("button.reset", { ns: "common" })}
                onClick={onCancel}
              >
                {t("button.reset", { ns: "common" })}
              </Button>
              <Button
                variant="select"
                disabled={!changedValue || isLoading}
                className="flex flex-1"
                aria-label="Save"
                onClick={saveToConfig}
              >
                {isLoading ? (
                  <div className="flex flex-row items-center gap-2">
                    <ActivityIndicator />
                    <span>{t("button.saving", { ns: "common" })}</span>
                  </div>
                ) : (
                  t("button.save", { ns: "common" })
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
