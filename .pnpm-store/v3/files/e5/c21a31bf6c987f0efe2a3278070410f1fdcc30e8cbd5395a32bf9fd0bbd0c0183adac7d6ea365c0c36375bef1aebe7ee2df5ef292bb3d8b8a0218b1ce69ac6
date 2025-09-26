If you'd like to prevent drag events propagation from the child to parent, you can use the `{noDragEventsBubbling}` property on the child:
```jsx harmony
import React from 'react';
import {useDropzone} from 'react-dropzone';

function OuterDropzone(props) {
  const {getRootProps} = useDropzone({
    // Note how this callback is never invoked if drop occurs on the inner dropzone
    onDrop: files => console.log(files)
  });

  return (
    <div className="container">
      <div {...getRootProps({className: 'dropzone'})}>
        <InnerDropzone />
        <p>Outer dropzone</p>
      </div>
    </div>
  );
}

function InnerDropzone(props) {
  const {getRootProps} = useDropzone({noDragEventsBubbling: true});
  return (
    <div {...getRootProps({className: 'dropzone'})}>
      <p>Inner dropzone</p>
    </div>
  );
}

<OuterDropzone />
```

Note that internally we use `event.stopPropagation()` to achieve the behavior illustrated above, but this comes with its own [drawbacks](https://javascript.info/bubbling-and-capturing#stopping-bubbling).

If you'd like to selectively turn off the default dropzone behavior for `onClick`, use the `{noClick}` property:
```jsx harmony
import React from 'react';
import {useDropzone} from 'react-dropzone';

function DropzoneWithoutClick(props) {
  const {getRootProps, getInputProps, acceptedFiles} = useDropzone({noClick: true});
  const files = acceptedFiles.map(file => <li key={file.path}>{file.path}</li>);

  return (
    <section className="container">
      <div {...getRootProps({className: 'dropzone'})}>
        <input {...getInputProps()} />
        <p>Dropzone without click events</p>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
      </aside>
    </section>
  );
}

<DropzoneWithoutClick />
```

If you'd like to selectively turn off the default dropzone behavior for `onKeyDown`, `onFocus` and `onBlur`, use the `{noKeyboard}` property:
```jsx harmony
import React from 'react';
import {useDropzone} from 'react-dropzone';

function DropzoneWithoutKeyboard(props) {
  const {getRootProps, getInputProps, acceptedFiles} = useDropzone({noKeyboard: true});
  const files = acceptedFiles.map(file => <li key={file.path}>{file.path}</li>);

  return (
    <section className="container">
      <div {...getRootProps({className: 'dropzone'})}>
        <input {...getInputProps()} />
        <p>Dropzone without keyboard events</p>
        <em>(SPACE/ENTER and focus events are disabled)</em>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
      </aside>
    </section>
  );
}

<DropzoneWithoutKeyboard />
```

Or you can prevent the default behavior for both click and keyboard events if you omit the input:
```jsx harmony
import React from 'react';
import {useDropzone} from 'react-dropzone';

function DropzoneWithoutClick(props) {
  const {getRootProps, acceptedFiles} = useDropzone();
  const files = acceptedFiles.map(file => <li key={file.path}>{file.path}</li>);

  return (
    <section className="container">
      <div {...getRootProps({className: 'dropzone'})}>
        <p>Dropzone without click events</p>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
      </aside>
    </section>
  );
}

<DropzoneWithoutClick />
```

**NOTE** If the browser supports the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) and you've set the `useFsAccessApi` to true, removing the `<input>` has no effect.

If you'd like to selectively turn off the default dropzone behavior for drag events, use the `{noDrag}` property:
```jsx harmony
import React from 'react';
import {useDropzone} from 'react-dropzone';

function DropzoneWithoutDrag(props) {
  const {getRootProps, getInputProps, acceptedFiles} = useDropzone({noDrag: true});
  const files = acceptedFiles.map(file => <li key={file.path}>{file.path}</li>);

  return (
    <section className="container">
      <div {...getRootProps({className: 'dropzone'})}>
        <input {...getInputProps()} />
        <p>Dropzone with no drag events</p>
        <em>(Drag 'n' drop is disabled)</em>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
      </aside>
    </section>
  );
}

<DropzoneWithoutDrag />
```

Keep in mind that if you provide your own callback handlers as well and use `event.stopPropagation()`, it will prevent the default dropzone behavior:
```jsx harmony
import React from 'react';
import Dropzone from 'react-dropzone';

// Note that there will be nothing logged when files are dropped
<Dropzone onDrop={files => console.log(files)}>
  {({getRootProps, getInputProps}) => (
    <div className="container">
      <div
        {...getRootProps({
          className: 'dropzone',
          onDrop: event => event.stopPropagation()
        })}
      >
        <input {...getInputProps()} />
        <p>Drag 'n' drop some files here, or click to select files</p>
      </div>
    </div>
  )}
</Dropzone>
```
