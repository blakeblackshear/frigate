import * as React from "react";

import { FileWithPath } from "file-selector";
export { FileWithPath };
export default function Dropzone(
  props: DropzoneProps & React.RefAttributes<DropzoneRef>
): React.ReactElement;
export function useDropzone(options?: DropzoneOptions): DropzoneState;

export interface DropzoneProps extends DropzoneOptions {
  children?(state: DropzoneState): React.ReactElement;
}

export enum ErrorCode {
  FileInvalidType = "file-invalid-type",
  FileTooLarge = "file-too-large",
  FileTooSmall = "file-too-small",
  TooManyFiles = "too-many-files",
}

export interface FileError {
  message: string;
  code: ErrorCode | string;
}

export interface FileRejection {
  file: FileWithPath;
  errors: readonly FileError[];
}

export type DropzoneOptions = Pick<React.HTMLProps<HTMLElement>, PropTypes> & {
  accept?: Accept;
  minSize?: number;
  maxSize?: number;
  maxFiles?: number;
  preventDropOnDocument?: boolean;
  noClick?: boolean;
  noKeyboard?: boolean;
  noDrag?: boolean;
  noDragEventsBubbling?: boolean;
  disabled?: boolean;
  onDrop?: <T extends File>(
    acceptedFiles: T[],
    fileRejections: FileRejection[],
    event: DropEvent
  ) => void;
  onDropAccepted?: <T extends File>(files: T[], event: DropEvent) => void;
  onDropRejected?: (fileRejections: FileRejection[], event: DropEvent) => void;
  getFilesFromEvent?: (
    event: DropEvent
  ) => Promise<Array<File | DataTransferItem>>;
  onFileDialogCancel?: () => void;
  onFileDialogOpen?: () => void;
  onError?: (err: Error) => void;
  validator?: <T extends File>(
    file: T
  ) => FileError | readonly FileError[] | null;
  useFsAccessApi?: boolean;
  autoFocus?: boolean;
};

export type DropEvent =
  | React.DragEvent<HTMLElement>
  | React.ChangeEvent<HTMLInputElement>
  | DragEvent
  | Event
  | Array<FileSystemFileHandle>;

export type DropzoneState = DropzoneRef & {
  isFocused: boolean;
  isDragActive: boolean;
  isDragAccept: boolean;
  isDragReject: boolean;
  isFileDialogActive: boolean;
  acceptedFiles: readonly FileWithPath[];
  fileRejections: readonly FileRejection[];
  rootRef: React.RefObject<HTMLElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
};

export interface DropzoneRef {
  open: () => void;
}

export interface DropzoneRootProps extends React.HTMLAttributes<HTMLElement> {
  refKey?: string;
  [key: string]: any;
}

export interface DropzoneInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  refKey?: string;
}

type PropTypes = "multiple" | "onDragEnter" | "onDragOver" | "onDragLeave";

export interface Accept {
  [key: string]: readonly string[];
}
