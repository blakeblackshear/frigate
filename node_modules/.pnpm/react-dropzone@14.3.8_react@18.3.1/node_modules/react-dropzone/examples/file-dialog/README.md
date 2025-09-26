You can programmatically invoke the default OS file prompt; just use the `open` method returned by the hook.

**Note** that for security reasons most browsers require popups and dialogues to originate from a direct user interaction (i.e. click).

If you are calling `open()` asynchronously, there’s a good chance it’s going to be blocked by the browser. So if you are calling `open()` asynchronously, be sure there is no more than *1000ms* delay between user interaction and `open()` call.

Due to the lack of official docs on this (at least we haven’t found any. If you know one, feel free to open PR), there is no guarantee that **allowed delay duration** will not be changed in later browser versions. Since implementations may differ between different browsers, avoid calling open asynchronously if possible.

```jsx harmony
import React from 'react';
import {useDropzone} from 'react-dropzone';

function Dropzone(props) {
  const {getRootProps, getInputProps, open, acceptedFiles} = useDropzone({
    // Disable click and keydown behavior
    noClick: true,
    noKeyboard: true
  });

  const files = acceptedFiles.map(file => (
    <li key={file.path}>
      {file.path} - {file.size} bytes
    </li>
  ));

  return (
    <div className="container">
      <div {...getRootProps({className: 'dropzone'})}>
        <input {...getInputProps()} />
        <p>Drag 'n' drop some files here</p>
        <button type="button" onClick={open}>
          Open File Dialog
        </button>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
      </aside>
    </div>
  );
}

<Dropzone />
```

Or use the `ref` exposed by the `<Dropzone>` component:

```jsx harmony
import React, {createRef} from 'react';
import Dropzone from 'react-dropzone';

const dropzoneRef = createRef();
const openDialog = () => {
  // Note that the ref is set async,
  // so it might be null at some point 
  if (dropzoneRef.current) {
    dropzoneRef.current.open()
  }
};

// Disable click and keydown behavior on the <Dropzone>
<Dropzone ref={dropzoneRef} noClick noKeyboard>
  {({getRootProps, getInputProps, acceptedFiles}) => {
    return (
      <div className="container">
        <div {...getRootProps({className: 'dropzone'})}>
          <input {...getInputProps()} />
          <p>Drag 'n' drop some files here</p>
          <button
            type="button"
            onClick={openDialog}
          >
            Open File Dialog
          </button>
        </div>
        <aside>
          <h4>Files</h4>
          <ul>
            {acceptedFiles.map(file => (
              <li key={file.path}>
                {file.path} - {file.size} bytes
              </li>
            ))}
          </ul>
        </aside>
      </div>
    );
  }}
</Dropzone>
```
