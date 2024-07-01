import { isDesktop } from "react-device-detect";
import { lazy } from "react";
import MonacoEditor from "./MonacoEditor";

/**
 * Provides an interface for a Code Editor, to enable easy swapping between different implementations
 */
export type CodeEditorProps = {
  initialContent: string;
  yamlSchemaUrl: string;
  onDidChangeContent: (content: string) => void;
};

/** Used to swap between the Monaco editor and the CodeMirror editor depending on device type.
 * The Monaco editor doesn't work well on mobile devices, see Github issue: https://github.com/microsoft/monaco-editor/issues/246
 *
 * A common solution is to switch to CodeMirror on mobile devices as they have invested significantly in touch support.
 *
 * It would be great to revisit this in in the future if/when Monaco improves mobile support.
 */
export const CodeEditor: (props: CodeEditorProps) => React.ReactNode = isDesktop
  ? MonacoEditor
  : lazy(() => import("./CodeMirrorEditor"));
