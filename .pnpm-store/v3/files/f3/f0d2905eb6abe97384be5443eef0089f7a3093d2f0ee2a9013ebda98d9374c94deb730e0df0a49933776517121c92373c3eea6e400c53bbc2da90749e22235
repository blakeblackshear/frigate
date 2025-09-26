# Changelog

### 3.0.5 (Mar 21, 2023)

- 🐛 Bugfix: Make `width` and `height` conditionally required if an `axis` is set. See [#196](https://github.com/react-grid-layout/react-resizable/issues/196)
- ✏ Chore: Minor dependency upgrades.
- ✏ Chore: Fix documentation of `onResize` callback arity.

### 3.0.4 (Jun 15, 2021)

- 🐛 Bugfix: Fix incorrect fix for `handleAxis` on DOM elements. [#175](https://github.com/react-grid-layout/react-resizable/issues/175)
- ✏ Chore:Upgrade dependencies.

### 3.0.3 (Jun 14, 2021)

- 🐛 Bugfix: Remove unknown prop `handleAxis` making it to DOM elements, causing a warning in dev.
- ✏ Chore: Rewrote `lockAspectRatio` logic to be more accurate and shorter.

### 3.0.2 (Jun 8, 2021)

- ✏ Chore: Add documentation for resize handles and fix a mistake where the `handleAxis` prop was not being passed to custom components.
  - See [Resize Handles](README.md#resize-handle)

### 3.0.1 (May 10, 2021)

- ✏ Chore: Reduce package size through `.npmignore`.

### 3.0.0 (May 10, 2021)

#### Breaking

- 🐛 Bugfix: Fixed handling of the `nodeRef` that needs to be passed to `<DraggableCore>` to avoid use of ReactDOM. This means that vanilla usage of `react-resizable` no longer requires ReactDOM. No code changes are needed in the usual case, except:
  * React `>= 16.3` is required due to use of `React.createRef()`, and
  * The `handle` prop now sends a `ReactRef<HTMLElement>` as its second argument and expects it to be used on your returned component.
    * If you do not attach the `ref`, you will receive the following error: `"<DraggableCore> not mounted on DragStart!"` This is due to the ref being present but not attached to any node.

### 1.11.1 (Mar 5, 2021)

- ✏ Chore: Added React 17 to peerDependencies.

### 1.11.0 (Sep 3, 2020)

- ⚠ Important Notice!
  - React-Resizable 2.0.0 was published due to a breaking change in `props` handling. This change ended up actually completely breaking certain workflows, for the dubious benefit of making the code slightly simpler to add to. The breaking change has been reverted, 2.0.0 is now deprecated, and we will continue on the 1.x branch. Future breaking changes to `react-resizable` will upgrade the major version to `3`.
- ➕ Feature: `<ResizableBox>` now takes a `style` prop which will be applied on the wrapping `<div>`. `width` and `height` in this prop are ignored.
- 🐛 Bugfix: remove unknown Prop `handle` from div children in Resizable `React.cloneElement`. [#124](https://github.com/STRML/react-resizable/issues/124)
- 🐛 Bugfix: Fix top and left resizing jerkiness. Thanks @conor-kelleher. [#136](https://github.com/STRML/react-resizable/pull/136)
- ✏ Chore: Improved test suite. Please contribute tests for your use cases if you have the time, I would really appreciate it! Thanks very much, @Danielecina
- ✏ Chore: Minor internal refactors and additional tests.
- ✏ Chore: Additional examples.

### 1.10.1 (Nov 25, 2019)

> Note: 1.10.0 was a mis-publish.

- ➕ Feature: Add `transformScale` prop [#115](https://github.com/STRML/react-resizable/pull/115)
- 🐛 Bugfix: Resolve `getDerivedStateFromProps` dev warning [#117](https://github.com/STRML/react-resizable/pull/117)

### 1.9.0 (Oct 24, 2019)

- 🐛 Bugfix: Fix resize with north/south handles when `lockAspectRatio=true` [#106](https://github.com/STRML/react-resizable/pull/106)
- ✏ Chore: Remove deprecated React 16.9 lifecycle methods (`componentWillReceiveProps`) (https://github.com/STRML/react-resizable/pull/112/commits/541dee69b8e45d91a533855609472b481634edee)
- ✏ Chore: Upgrade to babel 7
- ✏ Chore: [Remove unused state inside `<Draggable>`](https://github.com/STRML/react-resizable/pull/112/commits/05693f63d6d221ad652f0f28af024cfb46a5f2df). This has not been needed for quite some time, fixes [some bugs](https://github.com/STRML/react-resizable/issues/99) and improves performance.

### 1.8.0 (May 15, 2019)

- ➕ Feature: Added support for custom resize handles [#79](https://github.com/STRML/react-resizable/pull/79)
- ➕ Feature: Added support for resize handles on all corners [#191](https://github.com/STRML/react-resizable/pull/191)

### 1.7.5 (Sep 26, 2017)

- ✏ Chore: Support for React 16 (no changes required, updated `peerDependencies`)
- ✏ Chore: Minor dep updates.

### 1.7.4 (Sep 5, 2017)

- ✏ Chore: Minor Flow & dependency updates.

### 1.7.3 (Aug 31, 2017)

- 🐛 Bugfix: React deprecation warnings from `import *`
  - https://github.com/facebook/react/issues/10583

### 1.7.2 (Aug 21, 2017)

- ✏ Chore: Pkg: Add `react-draggable@3.0.0` to version range.
  - This package is compatible with both `@2` and `@3` versions.

### 1.7.1 (May 23, 2017)

- 🐛 Bugfix: Some flow types were improperly specified.

### 1.7.0 (May 1, 2017)

- ⚠ Deprecation: `React.PropTypes` now deprecated in React 15.5, moved to `prop-types` package
- ✏ Chore: Update devDeps, upgrade to webpack 2
- ✏ Chore: Remove babel `stage-1` and `transform-flow-comments`, bring in only selected plugins, makes for leaner dev/build.

### 1.6.0 (Jan 23, 2017)

- ➕ Feature: Allow restricting by axis. (#40, thanks @dnissley-al)

### 1.5.0 (Jan 23, 2017)

- 🐛 Bugfix: Persist SyntheticEvents when needed (#45, #46)
- ➕ Feature: Add componentWillReceiveProps to `<ResizableBox>` (#44, thanks @JoaoMosmann)

### 1.4.6 (Dec 30, 2016)

- ✏ Chore: Removed unused ref from `<Resizable>`.
- ✏ Chore: Added development lockfile.

### 1.4.5 (Sep 30, 2016)

- 🐛 Bugfix: Fix bad publish

### 1.4.4 (Sep 30, 2016)

- 🐛 Bugfix: Minor flow errors

### 1.4.3 (Sep 27, 2016)

- 🐛 Bugfix: Don't pass `onResize` in `<ResizableBox>`.
- 🐛 Bugfix: Fix new Flow errors (type parameters no longer optional).

### 1.4.2 (July 1, 2016)

- 🐛 Bugfix: Don't pass unknown props to underlying DOM element. Fixes React 15.2.0 warnings.

### 1.4.1 (May 23, 2016)

- 🐛 Bugfix: Resizable handle should have a `key` when injected. Fixes React warnings on custom components.

### 1.4.0 (May 20, 2016)

- ✏ Chore: Update to React-Draggable v2, which changed callback data structure.

### 1.3.4 (May 17, 2016)

- 🐛 Bugfix: Slack was not being reset on resizeStop. Fixes #34, #36.
- ✏ Chore: Added `flow-bin` to devDeps.

### 1.3.3 (Apr 19, 2016)

- ➕ Feature: Add Flow comments.

### 1.3.2 (Apr 8, 2016)

- 🐛 Bugfix: Prevent `width` and `height` from leaking to the underlying DOM element and being written.

### 1.3.1 (Apr 8, 2016)

- ✏ Chore: Allow React v15 in peerdeps.

### 1.3.0 (Mar 11, 2016)

- 🐛 Bugfix: Switch to ES2015 Loose Mode to fix IE9/10 issues.
- 🐛 Bugfix: Flow typing fixes.
- 🐛 Bugfix: Styling fixes to the demo page.

> Changes before 1.3.0 were not logged. Please see the git commit history.
