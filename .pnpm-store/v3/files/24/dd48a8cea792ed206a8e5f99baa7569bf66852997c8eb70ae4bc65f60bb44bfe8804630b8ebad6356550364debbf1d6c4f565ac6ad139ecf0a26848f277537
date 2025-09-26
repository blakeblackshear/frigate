# React Konva

[![Build Status](https://travis-ci.org/konvajs/react-konva.svg?branch=master)](https://travis-ci.org/konvajs/react-konva) [![Greenkeeper badge](https://badges.greenkeeper.io/konvajs/react-konva.svg)](https://greenkeeper.io/)

![ReactKonva Logo](https://cloud.githubusercontent.com/assets/1443320/12193428/3bda2fcc-b623-11e5-8319-b1ccfc95eaec.png)

React Konva is a JavaScript library for drawing complex canvas graphics using
[React](http://facebook.github.io/react/).

It provides declarative and reactive bindings to the
[Konva Framework](http://konvajs.github.io/).

# [OPEN DEMO](https://codesandbox.io/s/5m3nwp787x)

An attempt to make [React](http://facebook.github.io/react/) work with the HTML5
canvas library. The goal is to have similar declarative markup as normal React
and to have similar data-flow model.

**At the current moment, `react-konva` is not supported in React Native environment.**

Currently you can use all `Konva` components as React components and all `Konva`
events are supported on them in same way as normal browser events are supported.

## Installation

```bash
npm install react-konva konva --save
```

## [Tutorials and Documentation](https://konvajs.github.io/docs/react/)

## Example

```javascript
import React, { Component } from 'react';
import { render } from 'react-dom';
import { Stage, Layer, Rect, Text } from 'react-konva';
import Konva from 'konva';

const ColoredRect = () => {
  const [color, setColor] = useState('green');

  const handleClick = () => {
    setColor(Konva.Util.getRandomColor());
  };

  return (
    <Rect
      x={20}
      y={20}
      width={50}
      height={50}
      fill={color}
      shadowBlur={5}
      onClick={handleClick}
    />
  );
};

const App = () => {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text text="Try click on rect" />
        <ColoredRect />
      </Layer>
    </Stage>
  );
};

render(<App />, document.getElementById('root'));
```

To get more info about `Konva` you can read
[Konva Overview](http://konvajs.github.io/docs/overview.html).

**Actually you don't need to learn `react-konva`. Just learn `Konva` framework, you will understand how to use `react-konva`**

## Core API

`react-konva` supports all shapes, that `Konva` supports with the same names, and also it supports all the same events like `click`, `touchmove`, `dragend`, etc with "on" prefix like `onClick`, `onTouchMove`, `onDragEnd`.

### Getting reference to Konva objects

To get reference of `Konva` instance of a node you can use `ref` property.

```javascript
import React, { useEffect, useRef } from 'react';

const MyShape = () => {
  const circleRef = useRef();

  useEffect(() => {
    // log Konva.Circle instance
    console.log(circleRef.current);
  }, []);

  return <Circle ref={circleRef} radius={50} fill="black" />;
};
```

### Strict mode

By default `react-konva` works in "non-strict" mode. If you changed a property **manually** (or by user action like `drag&drop`) properties of the node will be not matched with properties from `render()`. `react-konva` updates ONLY properties changed in `render()`.

In strict mode `react-konva` will update all properties of the nodes to the values that you provided in `render()` function, no matter changed they or not.

You should decide what mode is better in your actual use case.

To enable strict mode globally you can do this:

```javascript
import { useStrictMode } from 'react-konva';

useStrictMode(true);
```

Or you can enable it only for some components:

```javascript
<Rect width={50} height={50} fill="black" _useStrictMode />
```

Take a look into this example:

```javascript
import { Circle } from 'react-konva';
import Konva from 'konva';

const Shape = () => {
  const [color, setColor] = React.useState();

  return (
    <Circle
      x={0}
      y={0}
      draggable
      radius={50}
      fill={color}
      onDragEnd={() => {
        setColor(Konva.Util.getRandomColor());
      }}
    />
  );
};
```

The circle is `draggable` and it changes its color on `dragend` event. In `strict` mode position of the node will be reset back to `{x: 0, y: 0}` (as we defined in render). But in `non-strict` mode the circle will keep its position, because `x` and `y` are not changed in render.

### Minimal bundle

By default `react-konva` imports full `Konva` version. With all the shapes and all filters. To minimize bundle size you can use minimal core version of `react-konva`:

```javascript
// load minimal version of 'react-konva`
import { Stage, Layer, Rect } from 'react-konva/lib/ReactKonvaCore';

// minimal version has NO support for core shapes and filters
// if you want import a shape into Konva namespace you can just do this:
import 'konva/lib/shapes/Rect';
```

Demo: [https://codesandbox.io/s/6l97wny44z](https://codesandbox.io/s/6l97wny44z)

### Usage with React Context

**Note: this section may be not relevant, because this issue was fixed in `react-konva@18.2.2`. So context should work by default.**

Due to a [known issue](https://github.com/facebook/react/issues/13336) with React, Contexts are not accessible by children of the react-konva `Stage` component. If you need to subscribe to a context from within the `Stage`, you need to "bridge" the context by creating a `Provider` as a child of the `Stage`. For more info, see [this discussion](https://github.com/konvajs/react-konva/issues/188#issuecomment-478302062) and this [react-redux demo](https://github.com/konvajs/react-konva/issues/311#issuecomment-454411007). Here is an example of bridging the context ([live demo](https://codesandbox.io/s/ykqw8r4r21)):

```js
import React, { Component } from 'react';
import Konva from 'konva';
import { render } from 'react-dom';
import { Stage, Layer, Rect } from 'react-konva';

const ThemeContext = React.createContext('red');

const ThemedRect = () => {
  const value = React.useContext(ThemeContext);
  return (
    <Rect x={20} y={50} width={100} height={100} fill={value} shadowBlur={10} />
  );
};

const Canvas = () => {
  return (
    <ThemeContext.Consumer>
      {(value) => (
        <Stage width={window.innerWidth} height={window.innerHeight}>
          <ThemeContext.Provider value={value}>
            <Layer>
              <ThemedRect />
            </Layer>
          </ThemeContext.Provider>
        </Stage>
      )}
    </ThemeContext.Consumer>
  );
};

class App extends Component {
  render() {
    return (
      <ThemeContext.Provider value="blue">
        <Canvas />
      </ThemeContext.Provider>
    );
  }
}
```

### Usage with Next.js

Note: `react-konva` is designed to work in the client-side. On the server side, it will render just empty div. So it doesn't make much sense to use react-konva for server-side rendering. In Next.js you may have issue like

> Module not found: Can't resolve 'canvas'

Why do we see this error? `canvas` module is used for canvas rendering in Node.JS environment. `konva` library will use it there, but it doesn't have this dependency explicitly.

You have two ways to resolve the issue:

#### 1. Use dynamic loading

https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading

Based on this comment: https://github.com/konvajs/react-konva/issues/588#issuecomment-892895335

With this approach your canvas application will be loaded on the client-side only. So you will not have any issues with server-side rendering. Also `next.js` will automatically understand that it doesn't need to load `canvas` module, because it is used for server-side rendering only.
I would recommend to use this approach.

You need to define your canvas components somewhere in your `components` folder. It shouldn't be inside `pages` or `app` folder (because they are used for server rendering).

Your `components/canvas.js` file may look like this:

```js
'use client';
import { Stage, Layer, Circle } from 'react-konva';

function Canvas(props) {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Circle x={200} y={100} radius={50} fill="green" />
      </Layer>
    </Stage>
  );
}

export default Canvas;
```

Then you can use it in your page like this:

```js
'use client';
import dynamic from 'next/dynamic';

const Canvas = dynamic(() => import('../components/canvas'), {
  ssr: false,
});

export default function Page(props) {
  return <Canvas />;
}
```

#### 2. Install `canvas` package manually

To just ignore the error from Next.JS you can install `canvas` module manually:

```bash
npm install canvas
```

Next.js will still try to load full canvas module on the server-side, but it will not fail.

## Comparisons

### react-konva vs react-canvas

[react-canvas](https://github.com/Flipboard/react-canvas) is a completely
different react plugin. It allows you to draw DOM-like objects (images, texts)
on canvas element in very performant way. It is NOT about drawing graphics, but
react-konva is exactly for drawing complex graphics on `<canvas>` element from
React.

### react-konva vs react-art

[react-art](https://github.com/reactjs/react-art) allows you to draw graphics on
a page. It also supports SVG for output. But it has no support of events of
shapes.

### react-konva vs vanilla canvas

Vanilla canvas is faster because when you use `react-konva` you have two layers of abstractions. Konva framework is on top of canvas and React is on top of Konva.
Depending on the use case this approach can be slow.
The purpose of `react-konva` is to reduce the complexity of the application and use well-known declarative way for drawing on canvas.

## [CHANGELOG](https://github.com/konvajs/react-konva/releases)

**Note: you can find a lot of demos and examples of using Konva there:
[http://konvajs.github.io/](http://konvajs.github.io/). Really, just go there and take a look what Konva can do for you. You will be able to do the same with `react-konva` too.**

```

```
