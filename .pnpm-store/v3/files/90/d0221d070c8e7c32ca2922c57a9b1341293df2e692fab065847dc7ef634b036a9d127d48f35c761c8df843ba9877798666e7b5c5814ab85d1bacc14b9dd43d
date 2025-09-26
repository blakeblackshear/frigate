import React from "react";
import { useDropzone, DropzoneProps } from "../../";

export const Dropzone = ({ children, ...opts }: DropzoneProps) => {
  const { ...state } = useDropzone(opts);
  return children(state);
};

<Dropzone>
  {({ getRootProps, getInputProps }) => (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
    </div>
  )}
</Dropzone>;
