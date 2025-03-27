import Heading from "@/components/ui/heading";
import { FrigateConfig, SearchModelSize } from "@/types/frigateConfig";
import useSWR from "swr";
import axios from "axios";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useCallback, useContext, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
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
import { Trans, useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

type ClassificationSettings = {
  search: {
    enabled?: boolean;
    model_size?: SearchModelSize;
  };
  face: {
    enabled?: boolean;
    model_size?: SearchModelSize;
  };
  lpr: {
    enabled?: boolean;
  };
};

type ClassificationSettingsViewProps = {
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};
export default function ClassificationSettingsView({
  setUnsavedChanges,
}: ClassificationSettingsViewProps) {
  const { t } = useTranslation("views/settings");
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const [changedValue, setChangedValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReindexDialogOpen, setIsReindexDialogOpen] = useState(false);

  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  const [classificationSettings, setClassificationSettings] =
    useState<ClassificationSettings>({
      search: { enabled: undefined, model_size: undefined },
      face: { enabled: undefined, model_size: undefined },
      lpr: { enabled: undefined },
    });

  const [origSearchSettings, setOrigSearchSettings] =
    useState<ClassificationSettings>({
      search: { enabled: undefined, model_size: undefined },
      face: { enabled: undefined, model_size: undefined },
      lpr: { enabled: undefined },
    });

  useEffect(() => {
    if (config) {
      if (classificationSettings?.search.enabled == undefined) {
        setClassificationSettings({
          search: {
            enabled: config.semantic_search.enabled,
            model_size: config.semantic_search.model_size,
          },
          face: {
            enabled: config.face_recognition.enabled,
            model_size: config.face_recognition.model_size,
          },
          lpr: { enabled: config.lpr.enabled },
        });
      }

      setOrigSearchSettings({
        search: {
          enabled: config.semantic_search.enabled,
          model_size: config.semantic_search.model_size,
        },
        face: {
          enabled: config.face_recognition.enabled,
          model_size: config.face_recognition.model_size,
        },
        lpr: { enabled: config.lpr.enabled },
      });
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleClassificationConfigChange = (
    newConfig: Partial<ClassificationSettings>,
  ) => {
    setClassificationSettings((prevConfig) => ({
      search: { ...prevConfig.search, ...newConfig.search },
      face: { ...prevConfig.face, ...newConfig.face },
      lpr: { ...prevConfig.lpr, ...newConfig.lpr },
    }));
    setUnsavedChanges(true);
    setChangedValue(true);
  };

  const saveToConfig = useCallback(async () => {
    setIsLoading(true);

    axios
      .put(
        `config/set?semantic_search.enabled=${classificationSettings.search.enabled ? "True" : "False"}&semantic_search.model_size=${classificationSettings.search.model_size}&face_recognition.enabled=${classificationSettings.face.enabled ? "True" : "False"}&face_recognition.model_size=${classificationSettings.face.model_size}&lpr.enabled=${classificationSettings.lpr.enabled ? "True" : "False"}`,
        { requires_restart: 0 },
      )
      .then((res) => {
        if (res.status === 200) {
          toast.success(t("classification.toast.success"), {
            position: "top-center",
          });
          setChangedValue(false);
          updateConfig();
        } else {
          toast.error(
            t("classification.toast.error", { errorMessage: res.statusText }),
            { position: "top-center" },
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
          { position: "top-center" },
        );
      })
      .finally(() => {
        addMessage(
          "search_settings_restart",
          `Restart required (Classification settings changed)`,
          undefined,
          "search_settings",
        );
        setIsLoading(false);
      });
  }, [classificationSettings, t, addMessage, updateConfig]);

  const onCancel = useCallback(() => {
    setClassificationSettings(origSearchSettings);
    setChangedValue(false);
    removeMessage("search_settings", "search_settings");
  }, [origSearchSettings, removeMessage]);

  const onReindex = useCallback(() => {
    setIsLoading(true);

    axios
      .put("/reindex")
      .then((res) => {
        if (res.status === 202) {
          toast.success(t("classification.semanticSearch.reindexNow.success"), {
            position: "top-center",
          });
        } else {
          toast.error(
            t("classification.semanticSearch.reindexNow.error", {
              errorMessage: res.statusText,
            }),
            { position: "top-center" },
          );
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("classification.semanticSearch.reindexNow.error", {
            errorMessage,
          }),
          { position: "top-center" },
        );
      })
      .finally(() => {
        setIsLoading(false);
        setIsReindexDialogOpen(false);
      });
  }, [t]);

  useEffect(() => {
    if (changedValue) {
      addMessage(
        "search_settings",
        `Unsaved Classification settings changes`,
        undefined,
        "search_settings",
      );
    } else {
      removeMessage("search_settings", "search_settings");
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedValue]);

  useEffect(() => {
    document.title = t("documentTitle.classification");
  }, [t]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
        <Heading as="h3" className="my-2">
          {t("classification.title")}
        </Heading>
        <Separator className="my-2 flex bg-secondary" />
        <Heading as="h4" className="my-2">
          {t("classification.semanticSearch.title")}
        </Heading>
        <div className="max-w-6xl">
          <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
            <p>{t("classification.semanticSearch.desc")}</p>

            <div className="flex items-center text-primary">
              <Link
                to="https://docs.frigate.video/configuration/semantic_search"
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                {t("classification.semanticSearch.readTheDocumentation")}
                <LuExternalLink className="ml-2 inline-flex size-3" />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-lg flex-col space-y-6">
          <div className="flex flex-row items-center">
            <Switch
              id="enabled"
              className="mr-3"
              disabled={classificationSettings.search.enabled === undefined}
              checked={classificationSettings.search.enabled === true}
              onCheckedChange={(isChecked) => {
                handleClassificationConfigChange({
                  search: { enabled: isChecked },
                });
              }}
            />
            <div className="space-y-0.5">
              <Label htmlFor="enabled">
                {t("button.enabled", { ns: "common" })}
              </Label>
            </div>
          </div>
          <div className="space-y-3">
            <Button
              variant="default"
              disabled={isLoading || !classificationSettings.search.enabled}
              onClick={() => setIsReindexDialogOpen(true)}
              aria-label={t("classification.semanticSearch.reindexNow.label")}
            >
              {t("classification.semanticSearch.reindexNow.label")}
            </Button>
            <div className="mt-3 text-sm text-muted-foreground">
              <Trans ns="views/settings">
                classification.semanticSearch.reindexNow.desc
              </Trans>
            </div>
          </div>
          <div className="mt-2 flex flex-col space-y-6">
            <div className="space-y-0.5">
              <div className="text-md">
                {t("classification.semanticSearch.modelSize.label")}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <Trans ns="views/settings">
                    classification.semanticSearch.modelSize.desc
                  </Trans>
                </p>
                <ul className="list-disc pl-5 text-sm">
                  <li>
                    <Trans ns="views/settings">
                      classification.semanticSearch.modelSize.small.desc
                    </Trans>
                  </li>
                  <li>
                    <Trans ns="views/settings">
                      classification.semanticSearch.modelSize.large.desc
                    </Trans>
                  </li>
                </ul>
              </div>
            </div>
            <Select
              value={classificationSettings.search.model_size}
              onValueChange={(value) =>
                handleClassificationConfigChange({
                  search: { model_size: value as SearchModelSize },
                })
              }
            >
              <SelectTrigger className="w-20">
                {classificationSettings.search.model_size}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {["small", "large"].map((size) => (
                    <SelectItem
                      key={size}
                      className="cursor-pointer"
                      value={size}
                    >
                      {t(
                        "classification.semanticSearch.modelSize." +
                          size +
                          ".title",
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <AlertDialog
          open={isReindexDialogOpen}
          onOpenChange={setIsReindexDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("classification.semanticSearch.reindexNow.confirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                <Trans ns="views/settings">
                  classification.semanticSearch.reindexNow.confirmDesc
                </Trans>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsReindexDialogOpen(false)}>
                {t("button.cancel", { ns: "common" })}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onReindex}
                className={buttonVariants({ variant: "select" })}
              >
                {t("classification.semanticSearch.reindexNow.confirmButton")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="my-2 space-y-6">
          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            {t("classification.faceRecognition.title")}
          </Heading>
          <div className="max-w-6xl">
            <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
              <p>{t("classification.faceRecognition.desc")}</p>

              <div className="flex items-center text-primary">
                <Link
                  to="https://docs.frigate.video/configuration/face_recognition"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline"
                >
                  {t("classification.faceRecognition.readTheDocumentation")}
                  <LuExternalLink className="ml-2 inline-flex size-3" />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex w-full max-w-lg flex-col space-y-6">
            <div className="flex flex-row items-center">
              <Switch
                id="enabled"
                className="mr-3"
                disabled={classificationSettings.face.enabled === undefined}
                checked={classificationSettings.face.enabled === true}
                onCheckedChange={(isChecked) => {
                  handleClassificationConfigChange({
                    face: { enabled: isChecked },
                  });
                }}
              />
              <div className="space-y-0.5">
                <Label htmlFor="enabled">
                  {t("button.enabled", { ns: "common" })}
                </Label>
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-md">
                {t("classification.faceRecognition.modelSize.label")}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <Trans ns="views/settings">
                    classification.faceRecognition.modelSize.desc
                  </Trans>
                </p>
                <ul className="list-disc pl-5 text-sm">
                  <li>
                    <Trans ns="views/settings">
                      classification.faceRecognition.modelSize.small.desc
                    </Trans>
                  </li>
                  <li>
                    <Trans ns="views/settings">
                      classification.faceRecognition.modelSize.large.desc
                    </Trans>
                  </li>
                </ul>
              </div>
            </div>
            <Select
              value={classificationSettings.face.model_size}
              onValueChange={(value) =>
                handleClassificationConfigChange({
                  face: {
                    model_size: value as SearchModelSize,
                  },
                })
              }
            >
              <SelectTrigger className="w-20">
                {classificationSettings.face.model_size}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {["small", "large"].map((size) => (
                    <SelectItem
                      key={size}
                      className="cursor-pointer"
                      value={size}
                    >
                      {t(
                        "classification.faceRecognition.modelSize." +
                          size +
                          ".title",
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            {t("classification.licensePlateRecognition.title")}
          </Heading>
          <div className="max-w-6xl">
            <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
              <p>{t("classification.licensePlateRecognition.desc")}</p>

              <div className="flex items-center text-primary">
                <Link
                  to="https://docs.frigate.video/configuration/license_plate_recognition"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline"
                >
                  {t(
                    "classification.licensePlateRecognition.readTheDocumentation",
                  )}
                  <LuExternalLink className="ml-2 inline-flex size-3" />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex w-full max-w-lg flex-col space-y-6">
            <div className="flex flex-row items-center">
              <Switch
                id="enabled"
                className="mr-3"
                disabled={classificationSettings.lpr.enabled === undefined}
                checked={classificationSettings.lpr.enabled === true}
                onCheckedChange={(isChecked) => {
                  handleClassificationConfigChange({
                    lpr: { enabled: isChecked },
                  });
                }}
              />
              <div className="space-y-0.5">
                <Label htmlFor="enabled">
                  {t("button.enabled", { ns: "common" })}
                </Label>
              </div>
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
  );
}
