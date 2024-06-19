import { EditorState } from "@codemirror/state";
import { yaml } from "@codemirror/lang-yaml";
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { useEffect, useRef } from "react";
import type { CodeEditorProps } from "./CodeEditor";
import {
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { vscodeLight, githubDark } from "@uiw/codemirror-themes-all";
import { useTheme } from "@/context/theme-provider";

/**
 * Uses `CodeMirror` as a code editor implementation.
 * Currently doesn't support yaml schema validation or linting.
 */
export function CodeMirrorEditor({
  initialContent,
  onDidChangeContent,
}: Omit<CodeEditorProps, "schemaUrl">) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme, systemTheme } = useTheme();

  useEffect(() => {
    if (containerRef.current == null) {
      return;
    }

    const onChangeListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onDidChangeContent(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        // vscodeDark isn't highlighting colors properly in yaml
        (systemTheme || theme) == "dark" ? githubDark : vscodeLight,
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
          indentWithTab,
        ]),
        yaml(),
        onChangeListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      view.destroy();
    };
  }, [initialContent, onDidChangeContent, systemTheme, theme]);

  return <div ref={containerRef} className="h-full w-full overflow-y-scroll" />;
}
