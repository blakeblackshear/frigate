# react-modal

Accessible modal dialog component for React.JS

[![Build Status](https://img.shields.io/github/actions/workflow/status/reactjs/react-modal/test.yml?branch=master)](https://github.com/reactjs/react-modal/actions/workflows/test.yml)
[![Coverage Status](https://coveralls.io/repos/github/reactjs/react-modal/badge.svg?branch=master)](https://coveralls.io/github/reactjs/react-modal?branch=master)
![gzip size](http://img.badgesize.io/https://unpkg.com/react-modal/dist/react-modal.min.js?compression=gzip)
[![Join the chat at https://gitter.im/react-modal/Lobby](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/react-modal/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Table of Contents

* [Installation](#installation)
* [API documentation](#api-documentation)
* [Examples](#examples)
* [Demos](#demos)

## Installation

To install, you can use [npm](https://npmjs.org/) or [yarn](https://yarnpkg.com):


    $ npm install --save react-modal
    $ yarn add react-modal
    
To install react-modal in React CDN app:

   - Add this CDN script tag after React CDN scripts and before your JS files (for example from [cdnjs](https://cdnjs.com/)): 

            <script src="https://cdnjs.cloudflare.com/ajax/libs/react-modal/3.14.3/react-modal.min.js"
            integrity="sha512-MY2jfK3DBnVzdS2V8MXo5lRtr0mNRroUI9hoLVv2/yL3vrJTam3VzASuKQ96fLEpyYIT4a8o7YgtUs5lPjiLVQ=="
            crossorigin="anonymous"
            referrerpolicy="no-referrer"></script>

   - Use `<ReactModal>` tag inside your React CDN app.


## API documentation

The primary documentation for react-modal is the
[reference book](https://reactjs.github.io/react-modal), which describes the API
and gives examples of its usage.

## Examples

Here is a simple example of react-modal being used in an app with some custom
styles and focusable input elements within the modal content:

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import Modal from 'react-modal';

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

// Make sure to bind modal to your appElement (https://reactcommunity.org/react-modal/accessibility/)
Modal.setAppElement('#yourAppElement');

function App() {
  let subtitle;
  const [modalIsOpen, setIsOpen] = React.useState(false);

  function openModal() {
    setIsOpen(true);
  }

  function afterOpenModal() {
    // references are now sync'd and can be accessed.
    subtitle.style.color = '#f00';
  }

  function closeModal() {
    setIsOpen(false);
  }

  return (
    <div>
      <button onClick={openModal}>Open Modal</button>
      <Modal
        isOpen={modalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Example Modal"
      >
        <h2 ref={(_subtitle) => (subtitle = _subtitle)}>Hello</h2>
        <button onClick={closeModal}>close</button>
        <div>I am a modal</div>
        <form>
          <input />
          <button>tab navigation</button>
          <button>stays</button>
          <button>inside</button>
          <button>the modal</button>
        </form>
      </Modal>
    </div>
  );
}

ReactDOM.render(<App />, appElement);
```

You can find more examples in the `examples` directory, which you can run in a
local development server using `npm start` or `yarn run start`.

## Demos

There are several demos hosted on [CodePen](https://codepen.io) which
demonstrate various features of react-modal:

* [Minimal example](https://codepen.io/claydiffrient/pen/KNxgav)
* [Using setAppElement](https://codepen.io/claydiffrient/pen/ENegGJ)
* [Using onRequestClose](https://codepen.io/claydiffrient/pen/KNjVBx)
* [Using shouldCloseOnOverlayClick](https://codepen.io/claydiffrient/pen/woLzwo)
* [Using inline styles](https://codepen.io/claydiffrient/pen/ZBmyKz)
* [Using CSS classes for styling](https://codepen.io/claydiffrient/pen/KNjVrG)
* [Customizing the default styles](https://codepen.io/claydiffrient/pen/pNXgqQ)
