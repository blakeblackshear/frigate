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
import RestartDialog from "@/components/overlay/dialog/RestartDialog";
import { useTranslation } from "react-i18next";
import { useRestart } from "@/api/ws";

type SaveOptions = "saveonly" | "restart";

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

  const { data: config } = useSWR<string>("config/raw");

  const { theme, systemTheme } = useTheme();
  const [error, setError] = useState<string | undefined>();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const configRef = useRef<HTMLDivElement | null>(null);
  const schemaConfiguredRef = useRef(false);

  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const { send: sendRestart } = useRestart();

  const onHandleSaveConfig = useCallback(
    async (save_option: SaveOptions): Promise<void> => {
      if (!editorRef.current) {
        return;
      }

      try {
        const response = await axios.post(
          `config/save?save_option=${save_option}`,
          editorRef.current.getValue(),
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
    [editorRef, t],
  );

  const handleCopyConfig = useCallback(async () => {
    if (!editorRef.current) {
      return;
    }

    copy(editorRef.current.getValue());
    toast.success(t("toast.success.copyToClipboard"), {
      position: "top-center",
    });
  }, [editorRef, t]);

  const handleSaveAndRestart = useCallback(async () => {
    try {
      await onHandleSaveConfig("saveonly");
      setRestartDialogOpen(true);
    } catch (error) {
      // If save fails, error is already set in onHandleSaveConfig, no dialog opens
    }
  }, [onHandleSaveConfig]);

  useEffect(() => {
    if (!config) {
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
      modelRef.current = monaco.editor.createModel(config, "yaml", modelUri);
    } else {
      modelRef.current.setValue(config);
    }

    const container = configRef.current;

    if (container && !editorRef.current) {
      editorRef.current = monaco.editor.create(container, {
        language: "yaml",
        model: modelRef.current,
        scrollBeyondLastLine: false,
        theme: (systemTheme || theme) == "dark" ? "vs-dark" : "vs-light",
      });
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
  }, [config, apiHost, systemTheme, theme]);

  // monitoring state

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!config || !modelRef.current) {
      return;
    }

    modelRef.current.onDidChangeContent(() => {
      if (modelRef.current?.getValue() != config) {
        setHasChanges(true);
      } else {
        setHasChanges(false);
      }
    });
  }, [config]);

  useEffect(() => {
    if (config && modelRef.current) {
      modelRef.current.setValue(config);
      setHasChanges(false);
    }
  }, [config]);

  useEffect(() => {
    let listener: ((e: BeforeUnloadEvent) => void) | undefined;
    if (hasChanges) {
      listener = (e) => {
        e.preventDefault();
        e.returnValue = true;
        return "Exit without saving?";
      };
      window.addEventListener("beforeunload", listener);
    }

    return () => {
      if (listener) {
        window.removeEventListener("beforeunload", listener);
      }
    };
  }, [hasChanges]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="absolute bottom-2 left-0 right-0 top-2 md:left-2">
      <div className="relative h-full overflow-hidden">
        <div className="mr-1 flex items-center justify-between">
          <Heading as="h2" className="mb-0 ml-1 md:ml-0">
            {t("configEditor")}
          </Heading>
          <div className="flex flex-row gap-1">
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

        {error && (
          <div className="mt-2 max-h-[30%] overflow-auto whitespace-pre-wrap border-2 border-muted bg-background_alt p-4 text-sm text-danger md:max-h-[40%]">
            {error}
          </div>
        )}

        <div ref={configRef} className="mt-2 h-[calc(100%-2.75rem)]" />
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
