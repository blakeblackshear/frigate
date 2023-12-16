import useSWR from "swr";
import * as monaco from "monaco-editor";
import { configureMonacoYaml } from "monaco-yaml";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApiHost } from "@/api";
import Heading from "@/components/ui/heading";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { Button } from "@/components/ui/button";
import axios from "axios";
import copy from "copy-to-clipboard";
import { useTheme } from "@/context/theme-provider";

type SaveOptions = "saveonly" | "restart";

function ConfigEditor() {
  const apiHost = useApiHost();

  const { data: config } = useSWR<string>("config/raw");

  const { theme } = useTheme();
  const [success, setSuccess] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>();
  const modelRef = useRef<monaco.editor.IEditorModel | null>();

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
          }
        )
        .then((response) => {
          if (response.status === 200) {
            setError("");
            setSuccess(response.data.message);
          }
        })
        .catch((error) => {
          setSuccess("");

          if (error.response) {
            setError(error.response.data.message);
          } else {
            setError(error.message);
          }
        });
    },
    [editorRef]
  );

  const handleCopyConfig = useCallback(async () => {
    if (!editorRef.current) {
      return;
    }

    copy(editorRef.current.getValue());
  }, [editorRef]);

  useEffect(() => {
    if (!config) {
      return;
    }

    if (modelRef.current != null) {
      // we don't need to recreate the editor if it already exists
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

    const container = document.getElementById("container");

    if (container != undefined) {
      editorRef.current = monaco.editor.create(container, {
        language: "yaml",
        model: modelRef.current,
        scrollBeyondLastLine: false,
        theme: theme == "dark" ? "vs-dark" : "vs-light",
      });
    }
  });

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="absolute h-[70%] w-[96%] md:h-[85%] md:w-[88%]">
      <div className="lg:flex justify-between mr-1">
        <Heading as="h2">Config</Heading>
        <div>
          <Button
            size="sm"
            className="mx-1"
            onClick={(_) => handleCopyConfig()}
          >
            Copy Config
          </Button>
          <Button
            size="sm"
            className="mx-1"
            onClick={(_) => onHandleSaveConfig("restart")}
          >
            Save & Restart
          </Button>
          <Button
            size="sm"
            className="mx-1"
            onClick={(_) => onHandleSaveConfig("saveonly")}
          >
            Save Only
          </Button>
        </div>
      </div>

      {success && <div className="max-h-20 text-green-500">{success}</div>}
      {error && (
        <div className="p-4 overflow-scroll text-red-500 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div id="container" className="h-full mt-2" />
    </div>
  );
}

export default ConfigEditor;
