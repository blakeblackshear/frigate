The hook accepts a `getFilesFromEvent` prop that enhances the handling of dropped file system objects and allows more flexible use of them e.g. passing a function that accepts drop event of a folder and resolves it to an array of files adds plug-in functionality of folders drag-and-drop.

Though, note that the provided `getFilesFromEvent` fn must return a `Promise` with a list of `File` objects (or `DataTransferItem` of `{kind: 'file'}` when data cannot be accessed).
Otherwise, the results will be discarded and none of the drag events callbacks will be invoked.

In case you need to extend the `File` with some additional properties, you should use [Object.defineProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) so that the result will still pass through our filter:

```jsx harmony
import React from 'react';
import {useDropzone} from 'react-dropzone';

function Plugin(props) {
  const {acceptedFiles, getRootProps, getInputProps} = useDropzone({
    getFilesFromEvent: event => myCustomFileGetter(event)
  });

  const files = acceptedFiles.map(f => (
    <li key={f.name}>
      {f.name} has <strong>myProps</strong>: {f.myProp === true ? 'YES' : ''}
    </li>
  ));

  return (
    <section className="container">
      <div {...getRootProps({className: 'dropzone'})}>
        <input {...getInputProps()} />
        <p>Drag 'n' drop some files here, or click to select files</p>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
      </aside>
    </section>
  );
}

async function myCustomFileGetter(event) {
  const files = [];
  const fileList = event.dataTransfer ? event.dataTransfer.files : event.target.files;

  for (var i = 0; i < fileList.length; i++) {
    const file = fileList.item(i);
    
    Object.defineProperty(file, 'myProp', {
      value: true
    });

    files.push(file);
  }

  return files;
}

<Plugin />
```
