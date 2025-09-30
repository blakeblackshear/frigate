import useSWR from "swr";
import * as monaco from "monaco-editor";
import { configureMonacoYaml } from "monaco-yaml";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApiHost } from "@/api";
import Heading from "@/components/ui/heading";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import axios, { AxiosError } from "axios";
import copy from "copy-to-clipboard";
import { useTheme } from "@/context/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { LuCopy, LuSave } from "react-icons/lu";
import { MdOutlineRestartAlt } from "react-icons/md";
import { Settings, Code } from "lucide-react";
import RestartDialog from "@/components/overlay/dialog/RestartDialog";
import { useTranslation } from "react-i18next";
import { useRestart } from "@/api/ws";
import { useResizeObserver } from "@/hooks/resize-observer";
import { FrigateConfig } from "@/types/frigateConfig";
import { GuiConfigEditor } from "@/components/config/GuiConfigEditor";
import { configToYaml } from "@/lib/configUtils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SaveOptions = "saveonly" | "restart";
type EditorMode = "yaml" | "gui";

type ApiErrorResponse = {
  message?: string;
  detail?: string;
};

function ConfigEditor() {
  const { t } = useTranslation(["views/configEditor"]);
  const apiHost = useApiHost();

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const { data: rawConfig } = useSWR<string>("config/raw");

  const { theme, systemTheme } = useTheme();
  const [error, setError] = useState<string | undefined>();
  const [editorMode, setEditorMode] = useState<EditorMode>("yaml");

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const configRef = useRef<HTMLDivElement | null>(null);
  const schemaConfiguredRef = useRef(false);

  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const { send: sendRestart } = useRestart();

  // Store GUI config state
  const [guiConfigData, setGuiConfigData] = useState<Record<string, unknown>>(
    {},
  );

  const onHandleSaveConfig = useCallback(
    async (save_option: SaveOptions): Promise<void> => {
      let configData: string;

      if (editorMode === "yaml") {
        if (!editorRef.current) {
          return;
        }
        configData = editorRef.current.getValue();
      } else {
        // GUI mode - convert to YAML
        configData = configToYaml(guiConfigData);
      }

      try {
        const response = await axios.post(
          `config/save?save_option=${save_option}`,
          configData,
          {
            headers: { "Content-Type": "text/plain" },
          },
        );

        if (response.status === 200) {
          setError("");
          setHasChanges(false);
          toast.success(response.data.message, { position: "top-center" });
        }
      } catch (error) {
        toast.error(t("toast.error.savingError"), { position: "top-center" });

        const axiosError = error as AxiosError<ApiErrorResponse>;
        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.response?.data?.detail ||
          "Unknown error";

        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [editorRef, editorMode, guiConfigData, t],
  );

  const handleCopyConfig = useCallback(async () => {
    let configData: string;

    if (editorMode === "yaml") {
      if (!editorRef.current) {
        return;
      }
      configData = editorRef.current.getValue();
    } else {
      configData = configToYaml(guiConfigData);
    }

    copy(configData);
    toast.success(t("toast.success.copyToClipboard"), {
      position: "top-center",
    });
  }, [editorRef, editorMode, guiConfigData, t]);

  const handleSaveAndRestart = useCallback(async () => {
    try {
      await onHandleSaveConfig("saveonly");
      setRestartDialogOpen(true);
    } catch (error) {
      // If save fails, error is already set in onHandleSaveConfig, no dialog opens
    }
  }, [onHandleSaveConfig]);

  useEffect(() => {
    if (!rawConfig || editorMode !== "yaml") {
      return;
    }

    const modelUri = monaco.Uri.parse(
      `a://b/api/config/schema_${Date.now()}.json`,
    );

    // Configure Monaco YAML schema only once
    if (!schemaConfiguredRef.current) {
      configureMonacoYaml(monaco, {
        enableSchemaRequest: true,
        hover: true,
        completion: true,
        validate: true,
        format: true,
        schemas: [
          {
            uri: `${apiHost}api/config/schema.json`,
            fileMatch: [String(modelUri)],
          },
        ],
      });
      schemaConfiguredRef.current = true;
    }

    if (!modelRef.current) {
      modelRef.current = monaco.editor.createModel(rawConfig, "yaml", modelUri);
    } else {
      modelRef.current.setValue(rawConfig);
    }

    const container = configRef.current;

    if (container && !editorRef.current) {
      editorRef.current = monaco.editor.create(container, {
        language: "yaml",
        model: modelRef.current,
        scrollBeyondLastLine: false,
        theme: (systemTheme || theme) == "dark" ? "vs-dark" : "vs-light",
      });
      editorRef.current?.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          onHandleSaveConfig("saveonly");
        },
      );
    } else if (editorRef.current) {
      editorRef.current.setModel(modelRef.current);
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
      schemaConfiguredRef.current = false;
    };
  }, [rawConfig, apiHost, systemTheme, theme, onHandleSaveConfig, editorMode]);

  // Initialize GUI config from parsed config
  useEffect(() => {
    if (config && editorMode === "gui") {
      setGuiConfigData(config as unknown as Record<string, unknown>);
    }
  }, [config, editorMode]);

  // monitoring state

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!rawConfig || !modelRef.current) {
      return;
    }

    modelRef.current.onDidChangeContent(() => {
      if (modelRef.current?.getValue() != rawConfig) {
        setHasChanges(true);
      } else {
        setHasChanges(false);
      }
    });
  }, [rawConfig]);

  useEffect(() => {
    if (rawConfig && modelRef.current) {
      modelRef.current.setValue(rawConfig);
      setHasChanges(false);
    }
  }, [rawConfig]);

  useEffect(() => {
    let listener: ((e: BeforeUnloadEvent) => void) | undefined;
    if (hasChanges) {
      listener = (e) => {
        e.preventDefault();
        e.returnValue = true;
        return t("confirm");
      };
      window.addEventListener("beforeunload", listener);
    }

    return () => {
      if (listener) {
        window.removeEventListener("beforeunload", listener);
      }
    };
  }, [hasChanges, t]);

  // layout change handler

  const [{ width, height }] = useResizeObserver(configRef);

  useEffect(() => {
    if (editorRef.current) {
      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        editorRef.current?.layout();
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [error, width, height]);

  if (!rawConfig) {
    return <ActivityIndicator />;
  }

  return (
    <div className="absolute bottom-2 left-0 right-0 top-2 md:left-2">
      <div className="relative flex h-full flex-col overflow-hidden">
        <div className="mr-1 flex items-center justify-between">
          <div>
            <Heading as="h2" className="mb-0 ml-1 md:ml-0">
              {t(config?.safe_mode ? "safeConfigEditor" : "configEditor")}
            </Heading>
            {config?.safe_mode && (
              <div className="text-sm text-secondary-foreground">
                {t("safeModeDescription")}
              </div>
            )}
          </div>
          <div className="flex flex-row gap-2">
            <ToggleGroup
              type="single"
              value={editorMode}
              onValueChange={(value) => {
                if (value) setEditorMode(value as EditorMode);
              }}
            >
              <ToggleGroupItem value="yaml" aria-label="YAML mode">
                <Code className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">YAML</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="gui" aria-label="GUI mode">
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">GUI</span>
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              size="sm"
              className="flex items-center gap-2"
              aria-label={t("copyConfig")}
              onClick={() => handleCopyConfig()}
            >
              <LuCopy className="text-secondary-foreground" />
              <span className="hidden md:block">{t("copyConfig")}</span>
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-2"
              aria-label={t("saveAndRestart")}
              onClick={handleSaveAndRestart}
            >
              <div className="relative size-5">
                <LuSave className="absolute left-0 top-0 size-3 text-secondary-foreground" />
                <MdOutlineRestartAlt className="absolute size-4 translate-x-1 translate-y-1/2 text-secondary-foreground" />
              </div>
              <span className="hidden md:block">{t("saveAndRestart")}</span>
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-2"
              aria-label={t("saveOnly")}
              onClick={() => onHandleSaveConfig("saveonly")}
            >
              <LuSave className="text-secondary-foreground" />
              <span className="hidden md:block">{t("saveOnly")}</span>
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-1 flex-col overflow-hidden">
          {error && (
            <div className="mt-2 max-h-[30%] min-h-[2.5rem] overflow-auto whitespace-pre-wrap border-2 border-muted bg-background_alt p-4 text-sm text-danger md:max-h-[40%]">
              {error}
            </div>
          )}
          {editorMode === "yaml" ? (
            <div ref={configRef} className="flex-1 overflow-hidden" />
          ) : (
            <div className="flex-1 overflow-auto">
              {config && (
                <GuiConfigEditor
                  config={guiConfigData}
                  onSave={async (newConfig) => {
                    setGuiConfigData(newConfig);
                    setHasChanges(true);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
      <Toaster closeButton={true} />
      <RestartDialog
        isOpen={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onRestart={() => sendRestart("restart")}
      />
    </div>
  );
}

export default ConfigEditor;
