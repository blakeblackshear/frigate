# NoSleep.js

Prevent display sleep and enable wake lock in all Android and iOS web browsers.

Check out the [live demo](https://richtr.github.io/NoSleep.js/example) in any Android or iOS web browser.

## Installation

This library is available on [Bower](http://bower.io/) as **nosleep**.

`bower install nosleep`

This package is published to npm as **nosleep.js** and can be installed with:

`npm install nosleep.js`

Alternatively, you can manually add [NoSleep.js](https://github.com/richtr/NoSleep.js/blob/master/dist/NoSleep.js) to your project (or the [minified version](https://github.com/richtr/NoSleep.js/blob/master/dist/NoSleep.min.js)).

## Build from source

Install all development dependencies with:

`npm install`

To build this library run:

`npm run build`

A new build of [NoSleep.js](https://github.com/richtr/NoSleep.js/blob/master/dist/NoSleep.js) and [NoSleep.min.js](https://github.com/richtr/NoSleep.js/blob/master/dist/NoSleep.min.js) will now be available in the `/dist` directory.

## Usage
Import ES6 module:

```javascript
import NoSleep from 'nosleep.js';
```

Create a new NoSleep object and then enable or disable it when needed.

To create a new NoSleep object:

```javascript
var noSleep = new NoSleep();
```

To enable wake lock:

**NOTE: This function call must be wrapped in a user input event handler e.g. a mouse or touch handler**

```javascript
// Enable wake lock.
// (must be wrapped in a user input event handler e.g. a mouse or touch handler)
document.addEventListener('click', function enableNoSleep() {
  document.removeEventListener('click', enableNoSleep, false);
  noSleep.enable();
}, false);
```

To disable wake lock:

```javascript
// Disable wake lock at some point in the future.
// (does not need to be wrapped in any user input event handler)
noSleep.disable();
```

See [example/index.html](https://github.com/richtr/NoSleep.js/blob/master/example/index.html) (and the [live demo](https://richtr.github.io/NoSleep.js/example)) for more information.

## Feedback

If you find any bugs or issues please report them on the [NoSleep.js Issue Tracker](https://github.com/richtr/NoSleep.js/issues).

If you would like to contribute to this project please consider [forking this repo](https://github.com/richtr/NoSleep.js/fork), making your changes and then creating a new [Pull Request](https://github.com/richtr/NoSleep.js/pulls) back to the main code repository.

## License

MIT. Copyright (c) [Rich Tibbett](https://twitter.com/_richtr).

See the [LICENSE](https://github.com/richtr/NoSleep.js/blob/master/LICENSE) file.
