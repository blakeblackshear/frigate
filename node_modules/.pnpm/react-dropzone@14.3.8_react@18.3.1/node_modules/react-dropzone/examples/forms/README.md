React-dropzone does not submit the files in form submissions by default. 

If you need this behavior, you can add a hidden file input, and set the files into it. 


```jsx harmony
import React, {useRef} from 'react';
import {useDropzone} from 'react-dropzone';

function Dropzone(props) {
  const {required, name} = props; 

  const hiddenInputRef = useRef(null);

  const {getRootProps, getInputProps, open, acceptedFiles} = useDropzone({
    onDrop: (incomingFiles) => {
      if (hiddenInputRef.current) {
        // Note the specific way we need to munge the file into the hidden input
        // https://stackoverflow.com/a/68182158/1068446
        const dataTransfer = new DataTransfer();
        incomingFiles.forEach((v) => {
          dataTransfer.items.add(v);
        });
        hiddenInputRef.current.files = dataTransfer.files;
      }
    }
  });

  const files = acceptedFiles.map(file => (
    <li key={file.path}>
      {file.path} - {file.size} bytes
    </li>
  ));

  return (
    <div className="container">
      <div {...getRootProps({className: 'dropzone'})}>
        {/*
          Add a hidden file input 
          Best to use opacity 0, so that the required validation message will appear on form submission
        */}
        <input type ="file" name={name} required={required} style ={{opacity: 0}} ref={hiddenInputRef}/>
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


<form onSubmit={(e) => {
  e.preventDefault(); 
  
  // Now get the form data as you regularly would
  const formData = new FormData(e.currentTarget);
  const file =  formData.get("my-file");
  alert(file.name); 
}}>
  <Dropzone name ="my-file" required/>
  <button type="submit">Submit</button>
</form>
```