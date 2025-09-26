import React, { createRef } from "react";
import Dropzone, { DropzoneRef } from "../../";

const ref = createRef<DropzoneRef>();

export const dropzone = (
  <Dropzone ref={ref}>
    {({ getRootProps, getInputProps }) => (
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        <p>Drop some files here.</p>
        <button type="button" onClick={ref.current.open}>
          Open file dialog
        </button>
      </div>
    )}
  </Dropzone>
);
