# its-fine

[![Size](https://img.shields.io/bundlephobia/minzip/its-fine?label=gzip&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/its-fine)
[![Version](https://img.shields.io/npm/v/its-fine?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/its-fine)
[![Downloads](https://img.shields.io/npm/dt/its-fine.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/its-fine)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/poimandres)

<p align="left">
  <a id="cover" href="#cover">
    <img src=".github/itsfine.jpg" alt="It's gonna be alright" />
  </a>
</p>

A collection of escape hatches for React.

As such, you can go beyond React's component abstraction; components are self-aware and can tap into the [React Fiber](https://youtu.be/ZCuYPiUIONs) tree. This enables powerful abstractions that can modify or extend React behavior without explicitly taking reconciliation into your own hands.

## Table of Contents

- [Components](#components)
  - [FiberProvider](#fiberprovider)
- [Hooks](#hooks)
  - [useFiber](#useFiber)
  - [useContainer](#useContainer)
  - [useNearestChild](#useNearestChild)
  - [useNearestParent](#useNearestParent)
  - [useContextMap](#useContextMap)
  - [useContextBridge](#useContextBridge)
- [Utils](#utils)
  - [traverseFiber](#traverseFiber)

## Components

### FiberProvider

A react-internal `Fiber` provider. This component binds React children to the React Fiber tree. Call its-fine hooks within this.

> **Note**: pmndrs renderers like react-three-fiber implement this internally to make use of [`useContextBridge`](#usecontextbridge), so you would only need this when using hooks inside of `react-dom` or `react-native`.

```tsx
import * as ReactDOM from 'react-dom/client'
import { FiberProvider, useFiber } from 'its-fine'

function App() {
  const fiber = useFiber()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <FiberProvider>
    <App />
  </FiberProvider>,
)
```

## Hooks

Useful React hook abstractions for manipulating and querying from a component. These must be called within a [`FiberProvider`](#fiberprovider) component.

### useFiber

Returns the current react-internal `Fiber`. This is an implementation detail of [react-reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler).

```tsx
import * as React from 'react'
import { type Fiber, useFiber } from 'its-fine'

function Component() {
  // Returns the current component's react-internal Fiber
  const fiber: Fiber<null> | undefined = useFiber()

  // function Component() {}
  if (fiber) console.log(fiber.type)
}
```

### useContainer

Returns the current react-reconciler container info passed to `Reconciler.createContainer`.

In react-dom, a container will point to the root DOM element; in react-three-fiber, it will point to the root Zustand store.

```tsx
import * as React from 'react'
import { useContainer } from 'its-fine'

function Component() {
  // Returns the current renderer's root container
  const container: HTMLDivElement | undefined = useContainer<HTMLDivElement>()

  // <div> (e.g. react-dom)
  if (container) console.log(container)
}
```

### useNearestChild

Returns the nearest react-reconciler child instance or the node created from `Reconciler.createInstance`.

In react-dom, this would be a DOM element; in react-three-fiber this would be an `Instance` descriptor.

```tsx
import * as React from 'react'
import { useNearestChild } from 'its-fine'

function Component() {
  // Returns a React Ref which points to the nearest child <div /> element.
  // Omit the element type to match the nearest element of any kind
  const childRef: React.MutableRefObject<HTMLDivElement | undefined> = useNearestChild<HTMLDivElement>('div')

  // Access child Ref on mount
  React.useEffect(() => {
    // <div> (e.g. react-dom)
    const child = childRef.current
    if (child) console.log(child)
  }, [])

  // A child element, can live deep down another component
  return <div />
}
```

### useNearestParent

Returns the nearest react-reconciler parent instance or the node created from `Reconciler.createInstance`.

In react-dom, this would be a DOM element; in react-three-fiber this would be an instance descriptor.

```tsx
import * as React from 'react'
import { useNearestParent } from 'its-fine'

function Component() {
  // Returns a React Ref which points to the nearest parent <div /> element.
  // Omit the element type to match the nearest element of any kind
  const parentRef: React.MutableRefObject<HTMLDivElement | undefined> = useNearestParent<HTMLDivElement>('div')

  // Access parent Ref on mount
  React.useEffect(() => {
    // <div> (e.g. react-dom)
    const parent = parentRef.current
    if (parent) console.log(parent)
  }, [])
}

// A parent element wrapping Component, can live deep up another component
;<div>
  <Component />
</div>
```

### useContextMap

Returns a map of all contexts and their values.

```tsx
import * as React from 'react'
import { useContextMap } from 'its-fine'

const SomeContext = React.createContext<string>(null!)

function Component() {
  const contextMap = useContextMap()
  return contextMap.get(SomeContext)
}
```

### useContextBridge

React Context currently cannot be shared across [React renderers](https://reactjs.org/docs/codebase-overview.html#renderers) but explicitly forwarded between providers (see [react#17275](https://github.com/facebook/react/issues/17275)). This hook returns a `ContextBridge` of live context providers to pierce Context across renderers.

Pass `ContextBridge` as a component to a secondary renderer to enable context-sharing within its children.

```tsx
import * as React from 'react'
// react-nil is a secondary renderer that is usually used for testing.
// This also includes Fabric, react-three-fiber, etc
import * as ReactNil from 'react-nil'
// react-dom is a primary renderer that works on top of a secondary renderer.
// This also includes react-native, react-pixi, etc.
import * as ReactDOM from 'react-dom/client'
import { type ContextBridge, useContextBridge, FiberProvider } from 'its-fine'

function Canvas(props: { children: React.ReactNode }) {
  // Returns a bridged context provider that forwards context
  const Bridge: ContextBridge = useContextBridge()
  // Renders children with bridged context into a secondary renderer
  ReactNil.render(<Bridge>{props.children}</Bridge>)
}

// A React Context whose provider lives in react-dom
const DOMContext = React.createContext<string>(null!)

// A component that reads from DOMContext
function Component() {
  // "Hello from react-dom"
  console.log(React.useContext(DOMContext))
}

// Renders into a primary renderer like react-dom or react-native,
// DOMContext wraps Canvas and is bridged into Component
ReactDOM.createRoot(document.getElementById('root')!).render(
  <FiberProvider>
    <DOMContext.Provider value="Hello from react-dom">
      <Canvas>
        <Component />
      </Canvas>
    </DOMContext.Provider>
  </FiberProvider>,
)
```

## Utils

Additional exported utility functions for raw handling of Fibers.

### traverseFiber

Traverses up or down a `Fiber`, return `true` to stop and select a node.

```ts
import { type Fiber, traverseFiber } from 'its-fine'

// Traverses through the Fiber tree, returns the current node when `true` is passed via selector
const parentDiv: Fiber<HTMLDivElement> | undefined = traverseFiber<HTMLDivElement>(
  // Input Fiber to traverse
  fiber as Fiber,
  // Whether to ascend and walk up the tree. Will walk down if `false`
  true,
  // A Fiber node selector, returns the first match when `true` is passed
  (node: Fiber<HTMLDivElement | null>) => node.type === 'div',
)
```
