/**
 * Launch an editor to open a file at a specific line and column.
 *
 * @param file File path with optional line and column numbers (e.g.
 *   "/path/to/file.js:10:2").
 * @param specifiedEditor Optional editor command or path to use. Will be
 *   parsed using `shell-quote`.
 * @param onErrorCallback Optional callback for handling errors.
 */
declare function launchEditor(
  file: string,
  specifiedEditor?: string | ((fileName: string, errorMessage: string | null) => void),
  onErrorCallback?: (fileName: string, errorMessage: string | null) => void
): void;

export = launchEditor;
