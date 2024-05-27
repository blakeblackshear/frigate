import useSWR from "swr";
import * as monaco from "monaco-editor";
import { configureMonacoYaml } from "monaco-yaml";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApiHost } from "@/api";
import Heading from "@/components/ui/heading";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import axios from "axios";
import copy from "copy-to-clipboard";
import { useTheme } from "@/context/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { LuCopy, LuSave } from "react-icons/lu";
import { MdOutlineRestartAlt } from "react-icons/md";

type SaveOptions = "saveonly" | "restart";

function ConfigEditor() {
  const apiHost = useApiHost();

  useEffect(() => {
    document.title = "Config Editor - Frigate";
  }, []);

  const { data: config } = useSWR<string>("config/raw");

  const { theme, systemTheme } = useTheme();
  const [error, setError] = useState<string | undefined>();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const configRef = useRef<HTMLDivElement | null>(null);

  const onHandleSaveConfig = useCallback(
    async (save_option: SaveOptions) => {
      if (!editorRef.current) {
        return;
      }

      axios
        .post(
          `config/save?save_option=${save_option}`,
          editorRef.current.getValue(),
          {
            headers: { "Content-Type": "text/plain" },
          },
        )
        .then((response) => {
          if (response.status === 200) {
            setError("");
            toast.success(response.data.message, { position: "top-center" });
          }
        })
        .catch((error) => {
          toast.error("Error saving config", { position: "top-center" });

          if (error.response) {
            setError(error.response.data.message);
          } else {
            setError(error.message);
          }
        });
    },
    [editorRef],
  );

  const handleCopyConfig = useCallback(async () => {
    if (!editorRef.current) {
      return;
    }

    copy(editorRef.current.getValue());
    toast.success("Config copied to clipboard.", { position: "top-center" });
  }, [editorRef]);

  useEffect(() => {
    if (!config) {
      return;
    }

    if (modelRef.current != null) {
      // we don't need to recreate the editor if it already exists
      editorRef.current?.layout();
      return;
    }

    const modelUri = monaco.Uri.parse("a://b/api/config/schema.json");

    if (monaco.editor.getModels().length > 0) {
      modelRef.current = monaco.editor.getModel(modelUri);
    } else {
      modelRef.current = monaco.editor.createModel(config, "yaml", modelUri);
    }

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

    const container = configRef.current;

    if (container != null) {
      editorRef.current = monaco.editor.create(container, {
        language: "yaml",
        model: modelRef.current,
        scrollBeyondLastLine: false,
        theme: (systemTheme || theme) == "dark" ? "vs-dark" : "vs-light",
      });
    }

    return () => {
      configRef.current = null;
      modelRef.current = null;
    };
  });

  useEffect(() => {
    if (config && modelRef.current) {
      modelRef.current.setValue(config);
    }
  }, [config]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="absolute bottom-2 left-0 right-0 top-2 md:left-2">
      <div className="relative h-full overflow-hidden">
        <div className="mr-1 flex items-center justify-between">
          <Heading as="h2" className="mb-0 ml-1 md:ml-0">
            Config Editor
          </Heading>
          <div className="flex flex-row gap-1">
            <Button
              size="sm"
              className="flex items-center gap-2"
              onClick={() => handleCopyConfig()}
            >
              <LuCopy className="text-secondary-foreground" />
              <span className="hidden md:block">Copy Config</span>
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-2"
              onClick={() => onHandleSaveConfig("restart")}
            >
              <div className="relative size-5">
                <LuSave className="absolute left-0 top-0 size-3 text-secondary-foreground" />
                <MdOutlineRestartAlt className="absolute size-4 translate-x-1 translate-y-1/2 text-secondary-foreground" />
              </div>
              <span className="hidden md:block">Save & Restart</span>
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-2"
              onClick={() => onHandleSaveConfig("saveonly")}
            >
              <LuSave className="text-secondary-foreground" />
              <span className="hidden md:block">Save Only</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-2 max-h-[30%] overflow-auto whitespace-pre-wrap border-2 border-muted bg-background_alt p-4 text-sm text-danger md:max-h-full">
            {error}
          </div>
        )}

        <div ref={configRef} className="mt-2 h-[calc(100%-2.75rem)]" />
      </div>
      <Toaster closeButton={true} />
    </div>
  );
}

export default ConfigEditor;
