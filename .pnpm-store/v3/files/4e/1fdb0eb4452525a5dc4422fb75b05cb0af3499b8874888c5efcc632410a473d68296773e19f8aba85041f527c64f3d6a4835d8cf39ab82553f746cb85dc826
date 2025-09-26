# Changelog

### 4.5.0 (Jun 25, 2025)

- Internal: Update clsx version (#754)
- Fix: bounds="selector" functionality when in a Shadow DOM tree. (#763)
- Perf: Update nodeRef type for React v19 compatibility (#769)
- Fix: forgotten requestAnimationFrame call (#773)
- Perf: setState in lifecycles + forced reflow (#556)
- Fix: add allowMobileScroll prop to allow for clicks to optionally pass through on mobile (#760)

### 4.4.6 (Sep 27, 2023)

- Fix: state inconsistency in React 18 #699
- Internal: devDependencies updates

### 4.4.5 (Apr 26, 2022)

- Fix: `grid` prop unused in `handleDragStop` #621
- Fix: `children` prop missing in TypeScript definition #648
- Internal: Various devDep updates

### 4.4.4 (Aug 27, 2021)

- Fix: Ensure `documentElement.style` actually exists. Fixes crashes in some obscure environments. #574 #575
- Fix: Add react/react-dom as `peerDependencies` again to fix Yarn PnP
- Size: Replace `classnames` with `clsx` to save a few bytes
- Internal: Additional tests on `ref` functionality and additional README content on `nodeRef`
- Internal: Lots of devDependencies updates
- Docs: Various README and demo updates, see git commits

### 4.4.3 (June 8, 2020)

- Add `nodeRef` to TypeScript definitions

### 4.4.2 (May 14, 2020)

- Fix: Remove "module" from package.json (it is no longer being built)
  - Fixes #482

### 4.4.1 (May 12, 2020)

- Fix: Remove "module" definition in package.json
  - Giving up on this: there isn't a great reason to publish modules
    here as they won't be significantly tree-shook, and it bloats
    the published package.
  - Fixes incompatiblity in 4.4.0 with webpack, where webpack is now
    selecting "module" because "browser" is no longer present.

### 4.4.0 (May 12, 2020)

- Add `nodeRef`:
  - If running in React Strict mode, ReactDOM.findDOMNode() is deprecated.
    Unfortunately, in order for `<Draggable>` to work properly, we need raw access
    to the underlying DOM node. If you want to avoid the warning, pass a `nodeRef`
    as in this example:
    ```js
    function MyComponent() {
      const nodeRef = React.useRef(null);
      return (
        <Draggable nodeRef={nodeRef}>
          <div ref={nodeRef}>Example Target</div>
        </Draggable>
      );
    }
    ````
    This can be used for arbitrarily nested components, so long as the ref ends up
    pointing to the actual child DOM node and not a custom component.
    Thanks to react-transition-group for the inspiration.
    `nodeRef` is also available on `<DraggableCore>`.
- Remove "browser" field in "package.json":
  - There is nothing special in the browser build that is actually practical
    for modern use. The "browser" field, as defined in 
    https://github.com/defunctzombie/package-browser-field-spec#overview,
    indicates that you should use it if you are directly accessing globals,
    using browser-specific features, dom manipulation, etc.
    
    React components like react-draggable are built to do minimal raw
    DOM manipulation, and to always gate this behind conditionals to ensure
    that server-side rendering still works. We don't make any changes
    to any of that for the "browser" build, so it's entirely redundant.
    
    This should also fix the "Super expression must either be null or
    a function" error (#472) that some users have experienced with particular
    bundler configurations.

    The browser build may still be imported at "build/web/react-draggable.min.js".
    This is to prevent breakage only. The file is no longer minified to prevent
    possible [terser bugs](https://github.com/terser/terser/issues/308).
  - The browser build will likely be removed entirely in 5.0.
- Fix: Make `bounds` optional in TypeScript [#473](https://github.com/strml/react-draggable/pull/473)

### 4.3.1 (Apr 11, 2020) 

> This is a bugfix release.

- Happy Easter!
- Fixed a serious bug that caused `<DraggableCore>` not to pass styles.
  - `React.cloneElement` has an odd quirk. When you do:
    ```js
    return React.cloneElement(this.props.children, {style: this.props.children.props.style});
    ```
    , `style` ends up undefined.
- Fixed a bug that caused debug output to show up in the build. 
  - `babel-loader` cache does not invalidate when it should. I had modified webpack.config.js in the last version but it reused stale cache.

### 4.3.0 (Apr 10, 2020)

- Fix setState warning after dismount if drag still active. Harmless, but prints a warning. [#424](https://github.com/mzabriskie/react-draggable/pull/424)
- Fix a long-standing issue where text inputs would unfocus upon dismounting a `<Draggable>`.
  - Thanks @schnerd, [#450](https://github.com/mzabriskie/react-draggable/pull/450)
- Fix an issue where the insides of a `<Draggable>` were not scrollable on touch devices due to the outer container having `touch-action: none`.
    - This was a long-standing hack for mobile devices. Without it, the page will scroll while you drag the element.
    - The new solution will simply cancel the touch event `e.preventDefault()`. However, due to changes in Chrome >= 56, this is only possible on 
      non-passive event handlers. To fix this, we now add/remove the touchEvent on lifecycle events rather than using React's event system.
    - [#465](https://github.com/mzabriskie/react-draggable/pull/465)
- Upgrade devDeps and fix security warnings. None of them actually applied to this module.

### 4.2.0 (Dec 2, 2019)

- Fix: Apply `scale` parameter also while dragging an element. [#438](https://github.com/mzabriskie/react-draggable/pull/438)
- Fix: Don't ship `process.env.DRAGGABLE_DEBUG` checks in cjs/esm. [#445](https://github.com/mzabriskie/react-draggable/pull/445)

### 4.1.0 (Oct 25, 2019)

- Add `"module"` to `package.json`. There are now three builds:
  * **`"main"`**: ES5-compatible CJS build, suitable for most use cases with maximum compatibility.
    - For legacy reasons, this has exports of the following shape, which ensures no surprises in CJS or ESM polyfilled environments:
      ```js
      module.exports = Draggable;
      module.exports.default = Draggable;
      module.exports.DraggableCore = DraggableCore;
      ```
  * **`"web"`**: Minified UMD bundle exporting to `window.ReactDraggable` with the same ES compatibility as the "main" build.
  * **`"module"`**: ES6-compatible build using import/export.

  This should fix issues like https://github.com/STRML/react-resizable/issues/113 while allowing modern bundlers to consume esm modules in the future.
  
  No compatibility changes are expected.

### 4.0.3 (Sep 10, 2019)

- Add typings and sourcemap to published npm package.
  - This compresses well so it does not bloat the package by much. Would be nice if npm had another delivery mechanism for optional modes, like web/TS.

### 4.0.2 (Sep 9, 2019)

- Republish to fix packaging errors. Fixes #426

### 4.0.1 (Sep 7, 2019)

- Republish of 4.0.0 to fix a mistake where webpack working files were erroneously included in the package. Use this release instead as it is much smaller.

### 4.0.0 (Aug 26, 2019)

> This is a major release due to a React compatibility change. If you are already on React >= 16.3, this upgrade is non-breaking.

- *Requires React 16.3+ due to use of `getDerivedStateFromProps`.
  - See https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html for why this was done.
- Upgraded build environment to Babel 7.
- Switched build from rollup to webpack@4 to simplify.
- Added CJS build that does not bundle `classNames` & `prop-types` into the build. This should result in marginally smaller bundle sizes for applications that use bundlers.
- Removed Bower build.

### 3.3.2 (Aug 16, 2019)

- Use `all: inherit` instead of `background: transparent;` to fix selection styles.
  - Fixes https://github.com/mzabriskie/react-draggable/issues/315

### 3.3.1 (Aug 12, 2019)

- Fix React 16.9 `componentWillMount` deprecation.

### 3.3.0 (Apr 18, 2019)

- Addition of `positionOffset` prop, which can be Numbers (px) or string percentages (like `"10%"`). See the README for more.

### 3.2.1 (Mar 1, 2019)

- Reverted https://github.com/mzabriskie/react-draggable/pull/361.

### ~3.2.0 (Feb 27, 2019)~

> Note: this release has been pulled due to an inadvertent breaking change. See https://github.com/mzabriskie/react-draggable/issues/391

- Feature: `defaultPosition` now allows string offsets (like {x: '10%', y: '10%'}) then calculates deltas from there. See the examples and the PR [#361](https://github.com/mzabriskie/react-draggable/pull/361/). Thanks to @tnrich and @eric-burel.
- Bugfix: Export `DraggableEvent` type for Flow consumers. Thanks @elie222.

### 3.1.1 (Dec 21, 2018)

- Bugfix: Minor type change on DraggableEventHandler TypeScript export ([#374](https://github.com/mzabriskie/react-draggable/pull/374))

### 3.1.0 (Dec 21, 2018)

- Feature: Added `scale` prop ([#352](https://github.com/mzabriskie/react-draggable/pull/352))
  - Thanks, @wootencl
- Bugfix: Remove process.browser which is missing in browser ([#329]((https://github.com/mzabriskie/react-draggable/pull/329))
- Bugfix: Fix selection api on IE ([#292](https://github.com/mzabriskie/react-draggable/pull/292))
- Bugfix: Fixes some issues in the type definitions for TypeScript ([#331]((https://github.com/mzabriskie/react-draggable/pull/331))
- Bugfix: Fix compare where portal elements are different instance to main window ([#359]((https://github.com/mzabriskie/react-draggable/pull/359))

### 3.0.5 (Jan 11, 2018)

- Bugfix: Fix crash in test environments during removeUserSelectStyles().

### 3.0.4 (Nov 27, 2017)

- Bugfix: Fix "Cannot call property 'call' of undefined" (matchesSelector)
  - Fixes [#300](https://github.com/mzabriskie/react-draggable/issues/300)

### 3.0.3 (Aug 31, 2017)

- Bugfix: Fix deprecation warnings caused by `import * as React` (Flow best practice).
  - See https://github.com/facebook/react/issues/10583

### 3.0.2 (Aug 22, 2017)

> 3.0.0 and 3.0.1 have been unpublished due to a large logfile making it into the package.

- Bugfix: Tweaked `.npmignore`.

### 3.0.1 (Aug 21, 2017)

- Bugfix: Flow-type should no longer throw errors for consumers.
  - It appears Flow can't resolve a sub-package's interfaces.

### 3.0.0 (Aug 21, 2017)

> Due to an export change, this is semver-major.

- Breaking: For TypeScript users, `<Draggable>` is now exported as `module.exports` and `module.exports.default`.
- Potentially Breaking: We no longer set `user-select: none` on all elements while dragging. Instead,
  the [`::selection` psuedo element](https://developer.mozilla.org/en-US/docs/Web/CSS/::selection) is used.
  - Depending on your application, this could cause issues, so be sure to test.
- Bugfix: Pass bounded `x`/`y` to callbacks. See [#226](https://github.com/mzabriskie/react-draggable/pull/226).
- Internal: Upgraded dependencies.

### 2.2.6 (Apr 30, 2017)

- Bugfix: Missing export default on TS definition (thanks @lostfictions)
- Internal: TS test suite (thanks @lostfictions)

### 2.2.5 (Apr 28, 2017)

- Bugfix: Typescript definition was incorrect. [#244](https://github.com/mzabriskie/react-draggable/issues/244)

### 2.2.4 (Apr 27, 2017)

- Internal: Moved `PropTypes` access to `prop-types` package for React 15.5 (prep for 16)
- Feature: Added TypeScript definitions (thanks @erfangc)
- Bugfix: No longer can erroneously add user-select style multiple times
- Bugfix: OffsetParent with padding problem, fixes [#218](https://github.com/mzabriskie/react-draggable/issues/218)
- Refactor: Misc example updates.

### 2.2.3 (Nov 21, 2016)

- Bugfix: Fix an issue with the entire window scrolling on a drag on iDevices. Thanks @JaneCoder. See #183

### 2.2.2 (Sep 14, 2016)

- Bugfix: Fix references to global when grabbing `SVGElement`, see [#162](https://github.com/mzabriskie/react-draggable/issues/162)
- Bugfix: Get `ownerDocument` before `onStop`, fixes [#198](https://github.com/mzabriskie/react-draggable/issues/198)

### 2.2.1 (Aug 11, 2016)

- Bugfix: Fix `getComputedStyle` error: see [#186](https://github.com/mzabriskie/react-draggable/issues/186), #190

### 2.2.0 (Jul 29, 2016)

- Addition: `offsetParent` property for an arbitrary ancestor for offset calculations.
  - Fixes e.g. dragging with a floating `offsetParent`.
    - Ref: https://github.com/mzabriskie/react-draggable/issues/170
- Enhancement: Make this library iframe-aware.
  - Ref: https://github.com/mzabriskie/react-draggable/pull/177
  - Thanks to @acusti for tests
- Bugfix: Lint/Test Fixes for new Flow & React versions

### 2.1.2 (Jun 5, 2016)

- Bugfix: Fix `return false` to cancel `onDrag` breaking on both old and new browsers due to missing `typeArg` and/or
  unsupported `MouseEventConstructor`. Fixes [#164](https://github.com/mzabriskie/react-draggable/issues/164).

### 2.1.1 (May 22, 2016)

- Bugfix: `<DraggableCore>` wasn't calling back with the DOM node.
- Internal: Rework test suite to use power-assert.

### 2.1.0 (May 20, 2016)

- Fix improperly missed `handle` or `cancel` selectors if the event originates from a child of the handle or cancel.
  - Fixes a longstanding issue, [#88](https://github.com/mzabriskie/react-draggable/pull/88)
  - This was pushed to a minor release as there may be edge cases (perhaps workarounds) where this changes behavior.

### 2.0.2 (May 19, 2016)

- Fix `cannot access clientX of undefined` on some touch-enabled platforms.
  - Fixes [#159](https://github.com/mzabriskie/react-draggable/pull/159),
    [#118](https://github.com/mzabriskie/react-draggable/pull/118)
- Fixed a bug with multi-finger multitouch if > 1 finger triggered an event at the same time.

### 2.0.1 (May 19, 2016)

- Finally fixed the IE10 constructor bug. Thanks @davidstubbs [#158](https://github.com/mzabriskie/react-draggable/pull/158)

### 2.0.0 (May 10, 2016)

- This is a breaking change. See the changes below in the beta releases.
  - Note the changes to event callbacks and `position` / `defaultPosition`.
- Changes from 2.0.0-beta3:
  - Small bugfixes for Flow 0.24 compatibility.
  - Don't assume `global.SVGElement`. Fixes JSDOM & [#123](https://github.com/mzabriskie/react-draggable/issues/123).

### 2.0.0-beta3 (Apr 19, 2016)

- Flow comments are now in the build. Other projects, such as React-Grid-Layout and React-Resizable, will
  rely on them in their build and export their own comments.

### 2.0.0-beta2 (Apr 14, 2016)

- We're making a small deviation from React Core's controlled vs. uncontrolled scheme; for convenience,
  `<Draggable>`s with a `position` property will still be draggable, but will revert to their old position
  on drag stop. Attach an `onStop` or `onDrag` handler to synchronize state.
  - A warning has been added informing users of this. If you make `<Draggable>` controlled but attach no callback
    handlers, a warning will be printed.

### 2.0.0-beta1 (Apr 14, 2016)

- Due to API changes, this is a major release.

#### Breaking Changes:

- Both `<DraggableCore>` and `<Draggable>` have had their callback types changed and unified.

```js
type DraggableEventHandler = (e: Event, data: DraggableData) => void | false;
type DraggableData = {
  node: HTMLElement,
  // lastX + deltaX === x
  x: number, y: number,
  deltaX: number, deltaY: number,
  lastX: number, lastY: number
};
```

- The `start` option has been renamed to `defaultPosition`.
- The `zIndex` option has been removed.

#### Possibly Breaking Changes:

- When determining deltas, we now use a new method that checks the delta against the Draggable's `offsetParent`.
  This method allows us to support arbitrary nested scrollable ancestors without scroll handlers!
  - This may cause issues in certain layouts. If you find one, please open an issue.

#### Enhancements:

- `<Draggable>` now has a `position` attribute. Its relationship to `defaultPosition` is much like
  `value` to `defaultValue` on React `<input>` nodes. If set, the position is fixed and cannot be mutated.
  If empty, the component will manage its own state. See [#140](https://github.com/mzabriskie/react-draggable/pull/140)
  for more info & motivations.
- Misc. bugfixes.

### 1.4.0-beta1 (Apr 13, 2016)

- Major improvements to drag tracking that now support even nested scroll boxes.
  - This revision is being done as a pre-release to ensure there are no unforeseen issues with the offset changes.

### 1.3.7 (Apr 8, 2016)

- Fix `user-select` prefixing, which may be different than the prefix required for `transform`.

### 1.3.6 (Apr 8, 2016)

- Republished after 1.3.5 contained a bundling error.

### 1.3.5 (Apr 8, 2016)

- Add React v15 to devDeps. `<Draggable>` supports both `v0.14` and `v15`.
- Enhancement: Clean up usage of browser prefixes; modern browsers will no longer use them.
  - This also removes the duplicated `user-select` style that is created on the `<body>` while dragging.
- Internal: Test fixes.

### 1.3.4 (Mar 5, 2016)

- Bugfix: Scrolling while dragging caused items to move unpredictably.

### 1.3.3 (Feb 11, 2016)

- Bugfix: #116: Android/Chrome are finicky; give up on canceling ghost clicks entirely.

### 1.3.2 (Feb 11, 2016)

- Bugfix: #116: Child inputs not focusing on touch events.

### 1.3.1 (Feb 10, 2016)

- Internal: Babel 6 and Flow definitions
- Bugfix: 1.3.0 broke string bounds ('parent', selectors, etc.).
- Bugfix: 1.3.0 wasn't updating deltaX and deltaY on a bounds hit.

### 1.3.0 (Feb 10, 2016)

- Possibly breaking change: bounds are calculated before `<Draggable>` fires `drag` events, as they should have been.
- Added `'none'` axis type. This allows using `<Draggable>` somewhat like `<DraggableCore>` - state will be kept
  internally (which makes bounds checks etc possible), but updates will not be flushed to the DOM.
- Performance tweaks.

### 1.2.0 (Feb 5, 2016)

- Added arbitrary boundary selector. Now you don't have to just use `'parent'`, you can select any element
  on the page, including `'body'`.
- Bugfix: Prevent invariant if a `<Draggable>` is unmounted while dragging.
- Bugfix: Fix #133, where items would eagerly start dragging off the mouse cursor if you hit boundaries and
  came back. This is due to how `<DraggableCore>` handles deltas only and does not keep state. Added new state
  properties `slackX` and `slackY` to `<Draggable>` to handle this and restore pre-v1 behavior.

### 1.1.3 (Nov 25, 2015)

- Bugfix: Server-side rendering with react-rails, which does bad things like mock `window`

### 1.1.2 (Nov 23, 2015)

- Bugfix: `<Draggable>` was calling back with clientX/Y, not offsetX/Y as it did pre-1.0. This unintended
  behavior has been fixed and a test has been added.

### 1.1.1 (Nov 14, 2015)

- Bugfix: Clean up scroll events if a component is unmounted before drag stops.
- Bugfix: `NaN` was returning from scroll events due to event structure change.
- Add scroll drag modulation test.

### 1.1.0 (Nov 14, 2015)

- Move `grid` into `<DraggableCore>` directly. It will continue to work on `<Draggable>`.
- Development fixes.

### 1.0.2 (Nov 7, 2015)

- Fix `enableUserSelectHack` not properly disabling.
- Fix a crash when the user scrolls the page with a Draggable active.

### 1.0.1 (Oct 28, 2015)

- Fix missing dist files for webpack.
- Ignore non-primary clicks. Added `allowAnyClick` option to allow other click types.

### 1.0.0 (Oct 27, 2015)

- Breaking: Removed `resetState()` instance method
- Breaking: Removed `moveOnStartChange` prop
- Breaking: React `0.14` support only.
- Refactored project.
- Module now exports a `<DraggableCore>` element upon which `<Draggable>` is based.
  This module is useful for building libraries and is completely stateless.

### 0.8.5 (Oct 20, 2015)

- Bugfix: isElementSVG no longer can be overwritten by getInitialState (#83)
- Bugfix: Fix for element prefixes in JSDOM

### 0.8.4 (Oct 15, 2015)

- Bugfix: SVG elements now properly use `transform` attribute instead of `style`. Thanks @martinRoss

### 0.8.3 (Oct 12, 2015)

- Bugfix: Short-circuiting drag throws due to `e.changedTouches` check.

### 0.8.2 (Sep 21, 2015)

- Handle scrolling while dragging. (#60)
- Add multi-touch support. (#68)
- IE fixes.
- Documentation updates. (#77)

### 0.8.1 (June 3, 2015)

- Add `resetState()` instance method for use by parents. See README ("State Problems?").

### 0.8.0 (May 19, 2015)

- Touch/mouse events rework. Fixes #51, #37, and #43, as well as IE11 support.
- Moved mousemove/mouseup and touch event handlers to document from window. Fixes IE9/10 support.
  IE8 is still not supported, as it is not supported by React.

### 0.7.4 (May 18, 2015)

- Fix a bug where a quick drag out of bounds to `0,0` would cause the element to remain in an inaccurate position,
  because the translation was removed from the CSS. See #55.

### 0.7.3 (May 13, 2015)

- Removed a `moveOnStartChange` optimization that was causing problems when attempting to move a `<Draggable>` back
  to its initial position. See https://github.com/STRML/react-grid-layout/issues/56

### 0.7.2 (May 8, 2015)

- Added `moveOnStartChange` property. See README.

### 0.7.1 (May 7, 2015)

- The `start` param is back. Pass `{x: Number, y: Number}` to kickoff the CSS transform. Useful in certain
  cases for simpler callback math (so you don't have to know its existing relative position and add it to
  the dragged position). Fixes #52.

### 0.7.0 (May 7, 2015)

- Breaking change: `bounds` with coordinates was confusing because it was using the item's width/height,
  which was not intuitive. When providing coordinates, `bounds` now simply restricts movement in each
  direction by that many pixels.

### 0.6.0 (May 2, 2015)

- Breaking change: Cancel dragging when onDrag or onStart handlers return an explicit `false`.
- Fix sluggish movement when `grid` option was active.
- Example updates.
- Move `user-select:none` hack to document.body for better highlight prevention.
- Add `bounds` option to restrict dragging within parent or within coordinates.

### 0.5.0 (May 2, 2015)

- Remove browserify browser config, reactify, and jsx pragma. Fixes #38
- Use React.cloneElement instead of addons cloneWithProps (requires React 0.13)
- Move to CSS transforms. Simplifies implementation and fixes #48, #34, #31.
- Fixup linting and space/tab errors. Fixes #46.

### 0.4.3 (Apr 30, 2015)

- Fix React.addons error caused by faulty test.

### 0.4.2 (Apr 30, 2015)

- Add `"browser"` config to package.json for browserify imports (fix #45).
- Remove unnecessary `emptyFunction` and `React.addons.classSet` imports.

### 0.4.1 (Apr 30, 2015)

- Remove react/addons dependency (now depending on `react` directly).
- Add MIT License file.
- Fix an issue where browser may be detected as touch-enabled but touch event isn't thrown.

### 0.4.0 (Jan 03, 2015)

- Improving accuracy of snap to grid
- Updating to React 0.12
- Adding dragging className
- Adding reactify support for browserify
- Fixing issue with server side rendering

### 0.3.0 (Oct 21, 2014)

- Adding support for touch devices

### 0.2.1 (Sep 10, 2014)

- Exporting as ReactDraggable

### 0.2.0 (Sep 10, 2014)

- Adding support for snapping to a grid
- Adding support for specifying start position
- Ensure event handlers are destroyed on unmount
- Adding browserify support
- Adding bower support

### 0.1.1 (Jul 26, 2014)

- Fixing dragging not stopping on mouseup in some cases

### 0.1.0 (Jul 25, 2014)

- Initial release
