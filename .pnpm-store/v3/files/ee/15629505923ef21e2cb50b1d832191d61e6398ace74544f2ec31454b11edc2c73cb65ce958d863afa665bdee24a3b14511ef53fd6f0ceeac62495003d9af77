If you'd like to integrate the dropzone with the [Pintura](https://pqina.nl/pintura/?ref=react-dropzone) image editor, you just need to pass either of the selected images to the `openDefaultEditor()` method exported by Pintura:

```jsx static
import React, { useState, useEffect } from 'react';

// React Dropzone
import { useDropzone } from 'react-dropzone';

// Pintura Image Editor
import 'pintura/pintura.css';
import { openDefaultEditor } from 'pintura';

// Based on the default React Dropzone image thumbnail example
// The `thumbButton` style positions the edit button in the bottom right corner of the thumbnail
const thumbsContainer = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    padding: 20,
};

const thumb = {
    position: 'relative',
    display: 'inline-flex',
    borderRadius: 2,
    border: '1px solid #eaeaea',
    marginBottom: 8,
    marginRight: 8,
    width: 100,
    height: 100,
    padding: 4,
    boxSizing: 'border-box',
};

const thumbInner = {
    display: 'flex',
    minWidth: 0,
    overflow: 'hidden',
};

const img = {
    display: 'block',
    width: 'auto',
    height: '100%',
};

const thumbButton = {
    position: 'absolute',
    right: 10,
    bottom: 10,
};

// This function is called when the user taps the edit button.
// It opens the editor and returns the modified file when done
const editImage = (image, done) => {
    const imageFile = image.pintura ? image.pintura.file : image;
    const imageState = image.pintura ? image.pintura.data : {};

    const editor = openDefaultEditor({
        src: imageFile,
        imageState,
    });

    editor.on('close', () => {
        // the user cancelled editing the image
    });

    editor.on('process', ({ dest, imageState }) => {
        Object.assign(dest, {
            pintura: { file: imageFile, data: imageState },
        });
        done(dest);
    });
};

function App() {
    const [files, setFiles] = useState([]);
    const { getRootProps, getInputProps } = useDropzone({
        accept: {
          'image/*': [],
        },
        onDrop: (acceptedFiles) => {
            setFiles(
                acceptedFiles.map((file) =>
                    Object.assign(file, {
                        preview: URL.createObjectURL(file),
                    })
                )
            );
        },
    });

    const thumbs = files.map((file, index) => (
        <div style={thumb} key={file.name}>
            <div style={thumbInner}>
                <img src={file.preview} style={img} alt="" />
            </div>
            <button
                style={thumbButton}
                onClick={() =>
                    editImage(file, (output) => {
                        const updatedFiles = [...files];

                        // replace original image with new image
                        updatedFiles[index] = output;

                        // revoke preview URL for old image
                        if (file.preview) URL.revokeObjectURL(file.preview);

                        // set new preview URL
                        Object.assign(output, {
                            preview: URL.createObjectURL(output),
                        });

                        // update view
                        setFiles(updatedFiles);
                    })
                }
            >
                Edit
            </button>
        </div>
    ));

    useEffect(
        () => () => {
            // Make sure to revoke the Object URL to avoid memory leaks
            files.forEach((file) => URL.revokeObjectURL(file.preview));
        },
        [files]
    );

    return (
        <section className="container">
            <div {...getRootProps({ className: 'dropzone' })}>
                <input {...getInputProps()} />
                <p>Drag 'n' drop some files here, or click to select files</p>
            </div>
            <aside style={thumbsContainer}>{thumbs}</aside>
        </section>
    );
}

export default App;
```
