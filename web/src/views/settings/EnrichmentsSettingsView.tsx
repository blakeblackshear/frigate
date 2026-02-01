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
import { useDocDomain } from "@/hooks/use-doc-domain";

type EnrichmentsSettings = {
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
  bird: {
    enabled?: boolean;
  };
};

type EnrichmentsSettingsViewProps = {
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};
export default function EnrichmentsSettingsView({
  setUnsavedChanges,
}: EnrichmentsSettingsViewProps) {
  const { t } = useTranslation("views/settings");
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const [changedValue, setChangedValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReindexDialogOpen, setIsReindexDialogOpen] = useState(false);

  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  const [enrichmentsSettings, setEnrichmentsSettings] =
    useState<EnrichmentsSettings>({
      search: { enabled: undefined, model_size: undefined },
      face: { enabled: undefined, model_size: undefined },
      lpr: { enabled: undefined },
      bird: { enabled: undefined },
    });

  const [origSearchSettings, setOrigSearchSettings] =
    useState<EnrichmentsSettings>({
      search: { enabled: undefined, model_size: undefined },
      face: { enabled: undefined, model_size: undefined },
      lpr: { enabled: undefined },
      bird: { enabled: undefined },
    });

  useEffect(() => {
    if (config) {
      if (enrichmentsSettings?.search.enabled == undefined) {
        setEnrichmentsSettings({
          search: {
            enabled: config.semantic_search.enabled,
            model_size: config.semantic_search.model_size,
          },
          face: {
            enabled: config.face_recognition.enabled,
            model_size: config.face_recognition.model_size,
          },
          lpr: { enabled: config.lpr.enabled },
          bird: {
            enabled: config.classification.bird.enabled,
          },
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
        bird: { enabled: config.classification.bird.enabled },
      });
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleEnrichmentsConfigChange = (
    newConfig: Partial<EnrichmentsSettings>,
  ) => {
    setEnrichmentsSettings((prevConfig) => ({
      search: { ...prevConfig.search, ...newConfig.search },
      face: { ...prevConfig.face, ...newConfig.face },
      lpr: { ...prevConfig.lpr, ...newConfig.lpr },
      bird: { ...prevConfig.bird, ...newConfig.bird },
    }));
    setUnsavedChanges(true);
    setChangedValue(true);
  };

  const saveToConfig = useCallback(async () => {
    setIsLoading(true);

    axios
      .put(
        `config/set?semantic_search.enabled=${enrichmentsSettings.search.enabled ? "True" : "False"}&semantic_search.model_size=${enrichmentsSettings.search.model_size}&face_recognition.enabled=${enrichmentsSettings.face.enabled ? "True" : "False"}&face_recognition.model_size=${enrichmentsSettings.face.model_size}&lpr.enabled=${enrichmentsSettings.lpr.enabled ? "True" : "False"}&classification.bird.enabled=${enrichmentsSettings.bird.enabled ? "True" : "False"}`,
        { requires_restart: 0 },
      )
      .then((res) => {
        if (res.status === 200) {
          toast.success(t("enrichments.toast.success"), {
            position: "top-center",
          });
          setChangedValue(false);
          updateConfig();
        } else {
          toast.error(
            t("enrichments.toast.error", { errorMessage: res.statusText }),
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
          "enrichments_settings_restart",
          t("enrichments.restart_required"),
          undefined,
          "enrichments_settings",
        );
        setIsLoading(false);
      });
  }, [enrichmentsSettings, t, addMessage, updateConfig]);

  const onCancel = useCallback(() => {
    setEnrichmentsSettings(origSearchSettings);
    setChangedValue(false);
    removeMessage("enrichments_settings", "enrichments_settings");
  }, [origSearchSettings, removeMessage]);

  const onReindex = useCallback(() => {
    setIsLoading(true);

    axios
      .put("/reindex")
      .then((res) => {
        if (res.status === 202) {
          toast.success(t("enrichments.semanticSearch.reindexNow.success"), {
            position: "top-center",
          });
        } else {
          toast.error(
            t("enrichments.semanticSearch.reindexNow.error", {
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
          t("enrichments.semanticSearch.reindexNow.error", {
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
        "enrichments_settings",
        t("enrichments.unsavedChanges"),
        undefined,
        "enrichments_settings",
      );
    } else {
      removeMessage("enrichments_settings", "enrichments_settings");
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedValue]);

  useEffect(() => {
    document.title = t("documentTitle.enrichments");
  }, [t]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto pb-2 md:order-none">
        <Heading as="h4" className="mb-2">
          {t("enrichments.title")}
        </Heading>
        <Separator className="my-2 flex bg-secondary" />
        <Heading as="h4" className="my-2">
          {t("enrichments.semanticSearch.title")}
        </Heading>
        <div className="max-w-6xl">
          <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
            <p>{t("enrichments.semanticSearch.desc")}</p>

            <div className="flex items-center text-primary">
              <Link
                to={getLocaleDocUrl("configuration/semantic_search")}
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

        <div className="flex w-full max-w-lg flex-col space-y-6">
          <div className="flex flex-row items-center">
            <Switch
              id="enabled"
              className="mr-3"
              disabled={enrichmentsSettings.search.enabled === undefined}
              checked={enrichmentsSettings.search.enabled === true}
              onCheckedChange={(isChecked) => {
                handleEnrichmentsConfigChange({
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
              disabled={isLoading || !enrichmentsSettings.search.enabled}
              onClick={() => setIsReindexDialogOpen(true)}
              aria-label={t("enrichments.semanticSearch.reindexNow.label")}
            >
              {t("enrichments.semanticSearch.reindexNow.label")}
            </Button>
            <div className="mt-3 text-sm text-muted-foreground">
              <Trans ns="views/settings">
                enrichments.semanticSearch.reindexNow.desc
              </Trans>
            </div>
          </div>
          <div className="mt-2 flex flex-col space-y-6">
            <div className="space-y-0.5">
              <div className="text-md">
                {t("enrichments.semanticSearch.modelSize.label")}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <Trans ns="views/settings">
                    enrichments.semanticSearch.modelSize.desc
                  </Trans>
                </p>
                <ul className="list-disc pl-5 text-sm">
                  <li>
                    <Trans ns="views/settings">
                      enrichments.semanticSearch.modelSize.small.desc
                    </Trans>
                  </li>
                  <li>
                    <Trans ns="views/settings">
                      enrichments.semanticSearch.modelSize.large.desc
                    </Trans>
                  </li>
                </ul>
              </div>
            </div>
            <Select
              value={enrichmentsSettings.search.model_size}
              onValueChange={(value) =>
                handleEnrichmentsConfigChange({
                  search: { model_size: value as SearchModelSize },
                })
              }
            >
              <SelectTrigger className="w-20">
                {t(
                  `enrichments.semanticSearch.modelSize.${enrichmentsSettings.search.model_size}.title`,
                )}
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
                        "enrichments.semanticSearch.modelSize." +
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
                {t("enrichments.semanticSearch.reindexNow.confirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                <Trans ns="views/settings">
                  enrichments.semanticSearch.reindexNow.confirmDesc
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
                {t("enrichments.semanticSearch.reindexNow.confirmButton")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="my-2 space-y-6">
          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            {t("enrichments.faceRecognition.title")}
          </Heading>
          <div className="max-w-6xl">
            <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
              <p>{t("enrichments.faceRecognition.desc")}</p>

              <div className="flex items-center text-primary">
                <Link
                  to={getLocaleDocUrl("configuration/face_recognition")}
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

          <div className="flex w-full max-w-lg flex-col space-y-6">
            <div className="flex flex-row items-center">
              <Switch
                id="enabled"
                className="mr-3"
                disabled={enrichmentsSettings.face.enabled === undefined}
                checked={enrichmentsSettings.face.enabled === true}
                onCheckedChange={(isChecked) => {
                  handleEnrichmentsConfigChange({
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
                {t("enrichments.faceRecognition.modelSize.label")}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <Trans ns="views/settings">
                    enrichments.faceRecognition.modelSize.desc
                  </Trans>
                </p>
                <ul className="list-disc pl-5 text-sm">
                  <li>
                    <Trans ns="views/settings">
                      enrichments.faceRecognition.modelSize.small.desc
                    </Trans>
                  </li>
                  <li>
                    <Trans ns="views/settings">
                      enrichments.faceRecognition.modelSize.large.desc
                    </Trans>
                  </li>
                </ul>
              </div>
            </div>
            <Select
              value={enrichmentsSettings.face.model_size}
              onValueChange={(value) =>
                handleEnrichmentsConfigChange({
                  face: {
                    model_size: value as SearchModelSize,
                  },
                })
              }
            >
              <SelectTrigger className="w-20">
                {t(
                  `enrichments.faceRecognition.modelSize.${enrichmentsSettings.face.model_size}.title`,
                )}
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
                        "enrichments.faceRecognition.modelSize." +
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
            {t("enrichments.licensePlateRecognition.title")}
          </Heading>
          <div className="max-w-6xl">
            <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
              <p>{t("enrichments.licensePlateRecognition.desc")}</p>

              <div className="flex items-center text-primary">
                <Link
                  to={getLocaleDocUrl(
                    "configuration/license_plate_recognition",
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

          <div className="flex w-full max-w-lg flex-col space-y-6">
            <div className="flex flex-row items-center">
              <Switch
                id="enabled"
                className="mr-3"
                disabled={enrichmentsSettings.lpr.enabled === undefined}
                checked={enrichmentsSettings.lpr.enabled === true}
                onCheckedChange={(isChecked) => {
                  handleEnrichmentsConfigChange({
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

          <Heading as="h4" className="my-2">
            {t("enrichments.birdClassification.title")}
          </Heading>
          <div className="max-w-6xl">
            <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
              <p>{t("enrichments.birdClassification.desc")}</p>

              <div className="flex items-center text-primary">
                <Link
                  to={getLocaleDocUrl("configuration/bird_classification")}
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

          <div className="flex w-full max-w-lg flex-col space-y-6">
            <div className="flex flex-row items-center">
              <Switch
                id="enabled"
                className="mr-3"
                disabled={enrichmentsSettings.bird.enabled === undefined}
                checked={enrichmentsSettings.bird.enabled === true}
                onCheckedChange={(isChecked) => {
                  handleEnrichmentsConfigChange({
                    bird: { enabled: isChecked },
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
