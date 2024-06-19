import { useTheme } from "@/context/theme-provider";
import * as monaco from "monaco-editor";
import { configureMonacoYaml } from "monaco-yaml";
import { useEffect, useRef, useState } from "react";
import type { CodeEditorProps } from "./CodeEditor";

export function MonacoEditor({
  initialContent,
  yamlSchemaUrl,
  onDidChangeContent,
}: CodeEditorProps) {
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [model, setModel] = useState<monaco.editor.ITextModel | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { theme, systemTheme } = useTheme();

  useEffect(() => {
    const disposeOnDidChangeContent = model?.onDidChangeContent(() => {
      onDidChangeContent(model.getValue());
    }).dispose;
    return () => {
      disposeOnDidChangeContent?.();
    };
  }, [model, onDidChangeContent]);

  useEffect(() => {
    if (!initialContent) {
      return;
    }

    if (model != null && editor != null) {
      // we don't need to recreate the editor if it already exists
      editor.layout();
      return;
    }

    const modelUri = monaco.Uri.parse("a://b/api/config/schema.json");

    let tempModel: monaco.editor.ITextModel;
    if (monaco.editor.getModels().length > 0) {
      tempModel = monaco.editor.getModel(modelUri)!;
    } else {
      tempModel = monaco.editor.createModel(initialContent, "yaml", modelUri);
    }
    setModel(tempModel);

    configureMonacoYaml(monaco, {
      enableSchemaRequest: true,
      hover: true,
      completion: true,
      validate: true,
      format: true,
      schemas: [
        {
          uri: yamlSchemaUrl,
          fileMatch: [String(modelUri)],
        },
      ],
    });

    if (containerRef.current != null) {
      setEditor(
        monaco.editor.create(containerRef.current, {
          language: "yaml",
          model: tempModel,
          scrollBeyondLastLine: false,
          theme: (systemTheme || theme) == "dark" ? "vs-dark" : "vs-light",
        }),
      );
    }

    return () => {
      containerRef.current = null;
    };
  }, [initialContent, model, editor, yamlSchemaUrl, systemTheme, theme]);

  return <div ref={containerRef} className="h-full w-full" />;
}
