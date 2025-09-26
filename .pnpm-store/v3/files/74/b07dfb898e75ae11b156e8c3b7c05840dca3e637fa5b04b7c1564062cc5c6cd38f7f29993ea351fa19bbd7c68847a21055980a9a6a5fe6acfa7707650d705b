If you'd like to use [react without JSX](https://reactjs.org/docs/react-without-jsx.html) you can:

```js harmony
import React, {useCallback, useState} from 'react';
import {useDropzone} from 'react-dropzone';

const e = React.createElement

function Basic () {
  const [files, setFiles] = useState([]);
  const onDrop = useCallback(files => setFiles(files), [setFiles]);

  const {getRootProps, getInputProps} = useDropzone({onDrop});

  const fileList = files.map(
    file => React.createElement('li', {key: file.name}, `${file.name} - ${file.size} bytes`)
  );

  return e('section', {className: 'container'}, [
    e('div', getRootProps({className: 'dropzone', key: 'dropzone'}), [
      e('input', getInputProps({key: 'input'})),
      e('p', {key: 'desc'}, "Drag 'n' drop some files here, or click to select files")
    ]),
    e('aside', {key: 'filesContainer'}, [
      e('h4', {key: 'title'}, 'Files'),
      e('ul', {key: 'fileList'}, fileList)
    ])
  ]);
}

Basic()
```
