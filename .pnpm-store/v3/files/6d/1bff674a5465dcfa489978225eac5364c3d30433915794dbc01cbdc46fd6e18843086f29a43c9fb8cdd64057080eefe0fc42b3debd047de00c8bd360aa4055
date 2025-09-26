# Changelog

## 1.5.2 (Jun 25, 2025)

- Fix `calcXY` when `isBounded=true` moving items incorrectly. Likely related to #2059. Thanks @wanpan11. [#2102](https://github.com/react-grid-layout/react-grid-layout/pull/2102)

## 1.5.1 (Mar 11, 2025)

- Fix for React 18: wrap state calls in `flushSync`. Thanks @ashharrison90. [#2043](https://github.com/react-grid-layout/react-grid-layout/pull/2043)

## 1.5.0 (Oct 9, 2024)

- Fix `calcXY` moving grid items slightly above and to the left of where they should be. Thanks @MaxMusing. [#2059](https://github.com/react-grid-layout/react-grid-layout/pull/2059)
- Change `onBreakpointChange`/`onLayoutChange` event order. `onBreakpointChange` now fires first. This should make managing responsive layouts easier, as you can set the current breakpoint in storage, then save the new layout to it.

## 1.4.4 (Nov 28, 2023)

### Bugfixes

- Fix position logic when draggable item is dragged into the grid. We no longer use the deprecated / non-standard `e.nativeEvent.layer{X,Y}` properties. [#1915](https://github.com/react-grid-layout/react-grid-layout/pull/1915)
- Fix drag values according to containerPadding. Previously, when dragging an item, the intuited position within the grid was _not_ modified by `containerPadding`, causing it to off by that value. On most grids, this is only set to `[10, 10]`, so this may not have been noticeable, but for higher values it was very obvious. Thanks @hywlss9. [#1323](https://github.com/react-grid-layout/react-grid-layout/pull/1323)
- Various lint/dependency fixes.

## 1.4.3 (Nov 8, 2023)

### Bugfixes

- Set `activeDrag` in `onDragStart`. Fixes issues where, if no drag is performed, the `onDragStop` handler would error out and the drag would freeze. [#1923](https://github.com/react-grid-layout/react-grid-layout/pull/1923)
  - THis fixes some broader issues with React 18 but testing library support is still not complete.

## 1.4.2 (Sep 22, 2023)

### Bugfixes

- Resizing in every directionnow obeys preventCollision restrictions [#1937](https://github.com/react-grid-layout/react-grid-layout/pull/1937)

## 1.4.1 (Sep 12, 2023)

### Bugfixes

- Fixed bug where height/width could not be resized if `h = 0` or `w = 0` and 0 `containerPadding`. [#1931](https://github.com/react-grid-layout/react-grid-layout/pull/1931)
- Revert `fast-equals` to @4. Fixes incompatibility with `Create-React-App@5`.

## 1.4.0 (Sep 11, 2023)

Hey, it's been a long time! Taking a year and a half off is a pretty "open-source" thing to do, thanks for bearing with me.

### New Features

- **Grid items can now be resized left and up!** Thanks to @ludovic and @dseif for all the hard work they did on this. [#1917](https://github.com/react-grid-layout/react-grid-layout/pull/1917)
  - To use, specify `resizeHandles` directions on your `<GridItem>`s. See [the example](/test/examples/20-resizable-handles.jsx) for more on how to do this.
  - See also [the demo](https://react-grid-layout.github.io/react-grid-layout/examples/20-resizable-handles.html).
- `<WidthProvider>` now uses a `ResizeObserver` instead of hooking into the window's `'resize'` event. [#1839](https://github.com/react-grid-layout/react-grid-layout/pull/1839)
  - This should not be breaking for any users but introduces a new dependency, [resize-observer-polyfill](https://www.npmjs.com/package/resize-observer-polyfill). It will not be imported unless you use `<WidthProvider>`.

### Bugfixes

- Fixed `horizontal` compact not always moving grid elements as far left as possible. [#1822](https://github.com/react-grid-layout/react-grid-layout/pull/1822)
- Fixed a bug when `allowOverlap={true}` and `compactType={null}`, where collisions would still be processed. [#1782](https://github.com/react-grid-layout/react-grid-layout/pull/1782)
- Fixed `onResizeStop` and `onDragStop` callbacks not returning updated layout. [#1613](https://github.com/react-grid-layout/react-grid-layout/pull/1613)
- An item will now rerender when `data-grid` props change. [#718](https://github.com/react-grid-layout/react-grid-layout/issues/718)
- Corrected draggableHandle configuration in static elements example [#1826](https://github.com/react-grid-layout/react-grid-layout/pull/1826)

### Internal Changes

- Various dependency upgrades and upgraded tests.
- Removed long-deprecated `_grid` property.
- Various doc updates.

## 1.3.4 (Feb 21, 2022)

### Bugfixes

- Add `e.stopPropagation()` on drag events to better support nested grids. Thanks @rogerfar [#1494](https://github.com/react-grid-layout/react-grid-layout/pull/1494).

### Internal Changes

- Various dependency upgrades.

## 1.3.3 (Jan 24, 2022)

This was a quick release to improve package size and dependency use. Thanks @salvoravida [#1655](https://github.com/react-grid-layout/react-grid-layout/pull/1655)

### Bugfixes

- Removed `coverage/` folder from npm package to save size
- Moved eslint parser to `devDependencies`

## 1.3.2 (Jan 24, 2022)

### Internal Changes

- Package size reduced by ~30% by removing source in `dist/` source maps.
- Various tests added (thanks @imagineLife!)
- New GitHub Actions flow for PRs

## 1.3.1 (Nov 29, 2021)

### Bugfixes

- Fix `allowOverlap` not firing `onLayoutChange()`. [#1620](https://github.com/react-grid-layout/react-grid-layout/pull/1620)
  - This was due to a short-circuiting of internal logic that did not properly clone the `layout` prop.

### Internal Changes

- Replace `classnames` with `clsx` for smaller package size. (#1543)

## 1.3.0 (Aug 27, 2021)

### New Features

- `allowOverlap` prop, when `true`, allows overlapping grid items. [#1470](https://github.com/react-grid-layout/react-grid-layout/pull/1470)
- Add `onDropDragOver` callback. [#1395](https://github.com/react-grid-layout/react-grid-layout/pull/1395)
  - Use this callback to dynamically adjust the `droppingItem` based on what is being dragged over. Return `w` and `h` to adjust the item. It is then [spread into the dropping placeholder](https://github.com/react-grid-layout/react-grid-layout/pull/1395/files#diff-83ab569936bfd4bf0460a4f23653ecbe8bc88509062c95e75c9402218b2b8733R609).
  - This callback has the type:
    - `onDragOver: (e: DragOverEvent) => { w: number, h: number } | false;`
    - Return `false` to short-circuit the dragover.

### Bugfixes

- Remove sorting when `compactType` is `null`. [#1474](https://github.com/react-grid-layout/react-grid-layout/pull/1474)
- Droppable fixes for Chrome behavior. [#1442](https://github.com/react-grid-layout/react-grid-layout/issues/1442) [#1448](https://github.com/react-grid-layout/react-grid-layout/issues/1442)
- Allow `null` children as a convenience so that inline expressions don't break the library. [#1296](https://github.com/react-grid-layout/react-grid-layout/pull/1296)
- Various dependency upgrades.

### Documentation

- Add docs on using custom components as grid children.
- Note required class on resizable handles for proper styling.

## 1.2.5 (May 10, 2021)

### Bugfixes

- Ensure no negative positions are possible when compacting
  - Thanks @DonnyLi [#829](https://github.com/react-grid-layout/react-grid-layout/pull/829)
  - Fixes [#535](https://github.com/react-grid-layout/react-grid-layout/issues/535)
- Fix resizing on mobile. This was caused by the `ref` refactor to remove ReactDOM in 1.2.3.
  - Fixes #[1458](https://github.com/react-grid-layout/react-grid-layout/issues/1458)
  - Note: this upgrades `react-resizable` to `3.0.1`, which like our other deps, is only compatible with `React@>=16.3`.

### Documentation

- Document new arity of `resizeHandle` (`(axis: ResizeHandleAxis, ref: ReactRef<HTMLElement>) => React$Element`)
- Remove references to the deprecated `verticalCompact` prop

## 1.2.4 (Mar 18, 2021)

_This version fixes a serious render bug in `<WidthProvider>`. 1.2.3 should not be used._

### Bugfixes

- Fix failure to mount when layout is WidthProvider-wrapped and `measureBeforeMount` is `true`.
  - Ref: [#1428](https://github.com/react-grid-layout/react-grid-layout/issues/1428)
- `<WidthProvider>` no longer updates grid with if it has been set to 0. This prevents unnecessary updates
  if the grid is set to `display: none;`. Thanks @405go [#1427](https://github.com/react-grid-layout/react-grid-layout/pull/1427)

## 1.2.3 (Mar 16, 2021)

### New Features

- React-Grid-Layout is now fully compatible with `<React.StrictMode>`.
  - Usage of `ReactDOM` has been removed by using `React.createRef()` inside RGL, and the new [`nodeRef` prop](https://github.com/react-grid-layout/react-draggable/blob/master/CHANGELOG.md#440-may-12-2020) in `react-draggable`.

## 1.2.2 (Mar 1, 2021)

### Bugfixes

- `onResize` as changed in 1.2.1 did not correctly save the layout. This is now fixed.
  - As you might guess, we need more test coverage! PRs are very welcome, I'll buy you beers on Cashapp or Patreon or whatever you like.

## 1.2.1 (Mar 1, 2021)

## Organization Changes

We have created the [React-Grid-Layout Organization](https://github.com/react-grid-layout)! Therefore the repository
[has moved](https://github.com/react-grid-layout/react-grid-layout).

This organization will grow as time goes on, and also contains the dependencies of RGL.

### Bugfixes

- Use `classList` in Firefox onDragOver hack. [#1310](https://github.com/STRML/react-grid-layout/pull/1310)
- Fix `scale` property. As `scale` support was added to dependencies, this caused double-compensation for scale, causing the dragged element not to follow the cursor. [#1393](https://github.com/STRML/react-grid-layout/pull/1393)
- Fix horizontal compact mode issue where it inadventently would compact the bottom of the grid. This is not useful nor intended. Thanks @s4m3. [#1390](https://github.com/STRML/react-grid-layout/pull/1390)
- Fix `onLayoutChange` sometimes not triggering on resize. We weren't cloning the layout item before modifying it. Thanks @xcqwan. [#1289](https://github.com/react-grid-layout/react-grid-layout/pull/1289)

### Internal Refactors

- Updated to the latest versions of all dependencies (enzyme, webpack, jest, flow).
- Held back React@17 as enzyme is [not yet ready](https://github.com/enzymejs/enzyme/issues/2429).

## 1.2.0 (Nov 17, 2020)

### New Features

- You can now customize your resizable handle component as supported by [`react-resizable`](https://github.com/STRML/react-resizable/blob/09fd865c0e1cc570caa8d67e44a2e56172d3d816/examples/ExampleLayout.js#L72). For example:

```js
<ReactGridLayout
  resizeHandle={<span className="custom-handle custom-handle-se" />}
  {...props}
/>
```

Thanks @typeetfunc [#1303](https://github.com/STRML/react-grid-layout/pull/1303)

### Bugfixes

- Fix `onDrop` handler not firing on Firefox if you drop over the placeholder.
  - Thanks @Charles-Lamoureux [#1333](https://github.com/STRML/react-grid-layout/pull/1333)
- Various example style fixes [#1283](https://github.com/STRML/react-grid-layout/pull/1283) [#1299](https://github.com/STRML/react-grid-layout/pull/1299)

## 1.1.1 (Sep 10, 2020)

Republish to add `dist/` folder for unpkg use.

## 1.1.0 (Sep 3, 2020)

### New Features

- You can now place resizable handles on all corners. Use the `resizeHandles` prop, which is default `['se']` (for 'southeast').
  - Allowable values are:
    - 's' - South handle (bottom-center)
    - 'w' - West handle (left-center)
    - 'e' - East handle (right-center)
    - 'n' - North handle (top-center)
    - 'sw' - Southwest handle (bottom-left)
    - 'nw' - Northwest handle (top-left)
    - 'se' - Southeast handle (bottom-right)
    - 'ne' - Northeast handle (top-right)
  - These values may be combined, e.g. `['s', 'se', 'e']`, to place three handles on the bottom side, bottom-right corner, and right side.

### Bugfixes

- Revert `containerPadding` change in #1138. This change was meant to be types-only, but it caused a behavioral change where the default value of `containerPadding` became `[0, 0]`, not `margin`, which is default `[10, 10]`.
- Add a few more files to `npmignore` to improve package size.

## 1.0.0 (July 20, 2020)

React-Grid-Layout has been in `0.x` status for far too long. With the addition of some new features in this version and a breaking change, I thought it was time to move to a stable semver.

### Breaking Changes

- `onDrop` callback now has a form more consistent with other callbacks.
  - Previous type: `(elemParams: { x: number, y: number, w: number, h: number, e: Event }) => void`
  - New type: `(layout: Layout, item: ?LayoutItem, e: Event) => void`
  - Thanks @ceberhar [#1169](https://github.com/STRML/react-grid-layout/pull/1169)
- Dropping Node 8 compatibility and testing due to devDep incompatibilities

### New Features

- Add `innerRef: React.Ref<'div'>` prop to expose a ref for the grid layout's outer div. Thanks @paul-sachs [#1176](https://github.com/STRML/react-grid-layout/pull/1176)
- Add `isBounded` property to prevent dragging items outside of the grid. Thanks @artembykov [#1248](https://github.com/STRML/react-grid-layout/pull/1248)

### Bugfixes

- Fix grid items stuck using percentages on first render. Thanks @rhbg [#1246](https://github.com/STRML/react-grid-layout/pull/1246)

## 0.18.3 (Mar 16, 2020)

### Bugfixes

- Fix `shouldComponentUpdate` interfering with droppability ([#1152](https://github.com/STRML/react-grid-layout/issues/1152))

### Internal Changes

- New Enzyme test suite added to prevent regression. If you have time, we could really use more test cases that reflect your use cases!

## 0.18.2 (Feb 26, 2020)

### Bugfixes

- `shouldComponentUpdate`:
  - A too-aggressive implementation of `shouldComponentUpdate` was shipped in 0.18.0-0.18.1 ([#1123](https://github.com/STRML/react-grid-layout/pull/1123)), which did not compare the `children` object. While this works well in many simple implementations of RGL, it breaks in more complex applications.
  - Reference equality of `props.children` and `nextProps.children` is now added to `<ReactGridLayout>` and `<GridItem>`. If you wish to take advantage of the performance improvements from the `shouldComponentUpdate` work, memoize your children.
  - A section has been added to the [README](/README.md#Performance) explaining how this works.
  - Fixed [#1150](https://github.com/STRML/react-grid-layout/issues/1150), [#1151](https://github.com/STRML/react-grid-layout/issues/1151).

## 0.18.1 (Feb 25, 2020)

This release contains typedef changes only.

### Bugfixes

- Flow types:
  - Make Props to `<ReactGridLayout>` and `<ResponsiveReactGridLayout>` exact.
  - Fix loss of props refinement when passing through `WidthProvider`.
  - Fix Flow errors as surfaced in [#1138](https://github.com/STRML/react-grid-layout/pull/1138).
  - Modify examples to use types so that the above type error can't resurface

## 0.18.0 (Feb 25, 2020)

Thanks to all of our maintainers for this big release. 0.18.0 contains a large number of bugfixes that users have been asking for. Please read the full list so you know what to expect. Some of the biggest improvements include fixing changes of `isResizable`/`isDraggable` without a remount ([#892](https://github.com/STRML/react-grid-layout/pull/892)), fixes to prop changes on `ResponsiveReactGridLayout` ([#1090](https://github.com/STRML/react-grid-layout/pull/1090)), `shouldComponentUpdate` improvements for speed ([#1123](https://github.com/STRML/react-grid-layout/pull/1123)), improvements to droppability ([#1127](https://github.com/STRML/react-grid-layout/pull/1127)), and much more.

### (Potentially) Breaking Changes

- You can now locally set `isDraggable`/`isResizable` on a `static` item and it will have that property. This could be useful, but be sure to check your layouts if you use `static`. Relates to [#1060](https://github.com/STRML/react-grid-layout/pull/1060).
- `shouldComponentUpdate` is now implemented on major components to improve render speed while you manipulate the layout. In our testing there are no issues. If you encounter one, please open an issue asap and we'll get it fixed. See [#1123](https://github.com/STRML/react-grid-layout/pull/1123).

### New Features

- You can now manipulate `isDraggable`/`isResizable` without the child component remounting. We do this by always rendering the child `<Resizable>` and `<Draggable>` wrappers, optionally in a `disabled` state. This feature has been heavily requested. [#892](https://github.com/STRML/react-grid-layout/pull/892)
- The event is now passed as `e` on the `onDrop` callback. [#1065](https://github.com/STRML/react-grid-layout/pull/1065)
- Pass `transformScale` to `Resizable`. [#1075](https://github.com/STRML/react-grid-layout/pull/1075)

### Bugfixes

- Fix handling of width changes in `ResponsiveReactGridLayout`. [#1090](https://github.com/STRML/react-grid-layout/pull/1090)
  - Fixes ignored changes of breakpoints and columns. See also [issue #1083](https://github.com/STRML/react-grid-layout/issues/1083).
- Forbid layout change on click without drag. [#1044](https://github.com/STRML/react-grid-layout/pull/1044)
- Do not mutate `layouts` prop. [#1064](https://github.com/STRML/react-grid-layout/pull/1064)
- Ensure locally set `isDraggable`/`isResizable` on a `GridItem` overrides the global setting on the layout. [#1060](https://github.com/STRML/react-grid-layout/pull/1060)
- Avoid additional element jumping when an item is dropped. [#1127](https://github.com/STRML/react-grid-layout/issues/1127)
- Don't use `String#includes` for Firefox test. [#1096](https://github.com/STRML/react-grid-layout/pull/1096)

### Internal Refactors

- Added `shouldComponentUpdate` to major elements for speed. Significant [performance improvements](https://github.com/STRML/react-grid-layout/pull/1032#issuecomment-541604763) while dragging. Started in [#1032](https://github.com/STRML/react-grid-layout/pull/1032) and finished in [#1123](https://github.com/STRML/react-grid-layout/pull/1123).
  - A [fun trick for the curious](https://github.com/STRML/react-grid-layout/blob/44e200067b3640c3230f5511e8624a7c629d2f9a/lib/fastRGLPropsEqual.js).
- Internal refactor of dropping capability. It is now more predictable and uses similar unit labels (`left`, `top`) to other features. [#1128](https://github.com/STRML/react-grid-layout/issues/1128)
- Upgrade devDependencies.
- Remove ESPower from test suite (not useful with Jest).

  0.17.1 (Oct 29, 2019)

---

### Bugfixes

- Surround `navigator` check in `try/catch` to avoid problems with mocked navigators [#1057](https://github.com/STRML/react-grid-layout/pull/1054)
- TransformScale is not applied properly while dragging an element [#1046](https://github.com/STRML/react-grid-layout/pull/1054)

  0.17.0 (Oct 24, 2019)

---

It's been 18 months since the last release, and this is a pretty large one! For references on the items below, see https://github.com/STRML/react-grid-layout/milestone/1?closed=1.

Thanks to @daynin and @n1ghtmare for taking an active role in maintaining RGL, and for giving it a much-needed shot in the arm, and thanks to the rest of our contributors.

### New Features

- Added ability to drag items into the grid from outside. [#980](https://github.com/STRML/react-grid-layout/pull/980). See [the example](https://react-grid-layout.github.io/react-grid-layout/examples/15-drag-from-outside.html).
  - This is especially exciting as it opens up new "widget toolbox" use cases such as [Example 14](https://react-grid-layout.github.io/react-grid-layout/examples/14-toolbox.html) with more intuitive interaction. Thanks @daynin.
- `transformScale` prop [#987](https://github.com/STRML/react-grid-layout/pull/987)
- `<ResponsiveReactGridLayout>` now supports margin-per-breakpoint [#1016](https://github.com/STRML/react-grid-layout/pull/1016)

### Bugfixes

- `onWidthChange` only called on breakpoint changes [#770](https://github.com/STRML/react-grid-layout/pull/770)
- Various movement bugs when compaction is off [#766](https://github.com/STRML/react-grid-layout/pull/766)
- Don't fire `onDragStop` if an item is only clicked, not dragged [#1023](https://github.com/STRML/react-grid-layout/pull/1023)
- Fix infinite loop when dragging over a static element. [#1019](https://github.com/STRML/react-grid-layout/pull/1019)

### Internal Refactors

- Both `react-draggable` and `react-resizable` dependencies are now React 16.9 compatible, as is now `react-grid-layout`.
  - [RGL PR #990](https://github.com/STRML/react-grid-layout/pull/990)
  - [react-resizable](https://github.com/STRML/react-resizable/pull/112/commits/541dee69b8e45d91a533855609472b481634edee)
  - [react-draggable](https://github.com/mzabriskie/react-draggable/commit/fea778c8e89db2a4e1a35e563b65634f8146e7e4)
- Webpack 4 [#907](https://github.com/STRML/react-grid-layout/pull/907)
- Babel 7 [#1013](https://github.com/STRML/react-grid-layout/pull/1013)
- Flow 0.110 [#995](https://github.com/STRML/react-grid-layout/pull/995)
- Jest [#774](https://github.com/STRML/react-grid-layout/pull/774)
- Various build simplifications [#773](https://github.com/STRML/react-grid-layout/pull/773)
- Various PR bots - thanks @daynin

  0.16.6 (Mar 8, 2018)

---

- Fixed collision issue where items below could rearrange on a move.
  - The root cause was "teleportation", or practically the same bug that leads to Pac-Man going through
    ghosts now and then. If a large element moves up by a few grid units, the space it vacates can suddenly
    become occupiable by an element below it. Rather than the collision happening properly, they exchange spaces
    atomically. The fix is to move items down one grid unit at a time to ensure
    this rearrangement does not happen.
  - Thanks @torkelo for your hard work on this for Grafana 5, which I very unfortunately managed to break
    when refactoring for 0.16.1.
  - Ref: #650, #739
- Added a "Toolbox" demo (thanks @jhob)

  0.16.5 (Feb 26, 2018)

---

- Minor fix to `isUserAction` on certain types of compaction cascades (#714, #720, #729)

  0.16.4 (Feb 15, 2018)

---

- Skip null items in processGridItem (#578)
- Resize is broken for grids with preventCollision: true, fixes #655 (#656)
- Minor refactoring

  0.16.3 (Jan 31, 2018)

---

- Fix overriding of `onStart` behaviour (#707, thanks @ersel)
- Fixed Flow type of WidthProvider
- Devdep updates

  0.16.2 (Dec 17, 2017)

---

- Fix `onLayoutChange` not firing properly due to regression introduced in 0.16.1
  - Ref: https://github.com/STRML/react-grid-layout/issues/683
- Simpler resize corner CSS (thanks @TrySound)
- Reformat code with Prettier & simplify lint configs (thanks @TrySound)

  0.16.1 (Dec 10, 2017)

---

- Flow def upgrades (thanks @TrySound)
- DevDep upgrades
- Fixed WebpackBin demo
- Addl test cases (thanks @torkelo)

  0.16.0 (Oct 6, 2017)

---

- Added horizontal compaction option, `compactType` (thanks @Rhjulskov)
- Added `preventCollision` option for static grids (thanks @EmrysMyrddin)

  0.15.2 (Sep 5, 2017)

---

- Fix missed `import *`
- Dependency updates

  0.15.1 (Sep 5, 2017)

---

- Fix React PropTypes & createClass warnings

  - See https://github.com/facebook/react/issues/10583

    0.15.0 (Aug 21, 2017)

---

- Package upgrades, including Webpack 3
- Flow typedef upgrades for the 0.53 rework
- Add faulty key value in duplicate key error message (#602)

  0.14.7 (Jul 14, 2017)

---

- Fixed a dragging bug when the grid container is scrollable. Thanks @chultquist.

  - Ref: https://github.com/STRML/react-grid-layout/pull/555

    0.14.6 (Apr 19, 2017)

---

- Fixed a bad publish (connectivity issue).

  0.14.5 (Apr 19, 2017)

---

- Moved to `prop-types` package to avoid React.PropTypes deprecation in 15.5. Thanks @inverts!

  0.14.4 (Mar 9, 2017)

---

#### Fixes:

- Typecheck in `WidthProvider` to satisfy Flow (and technically, this could be a Text node)

##### Dev:

- Update Flow

  0.14.3 (Feb 22, 2017)

---

#### Fixes:

- Reverted #499; `msTransform` is indeed correct. See [discussion](https://github.com/STRML/react-grid-layout/pull/499#issuecomment-281703069).

  0.14.2 (Feb 22, 2017)

---

#### Fixes:

- Fixed use of `MSTranform` for IE. Thanks @dvoaviarison (#499)
- Fix generation of source maps, which was temporarily broken by the webpack 2 upgrade.

#### Internal:

- Update development dependencies and babel version.

  0.14.1 (Feb 20, 2017)

---

#### Fixes:

- Fixed a minor Flow type issue when a `classnames` typedef is present.
- Fixed a scoping issue when running `make build-example`.

  0.14.0 (Feb 13, 2017)

---

#### Features:

- New test suite - thanks @nikolas
- Dev Dependency updates
- Committed yarn.lock
- Added `react-draggable` classname to draggable grid items.

  0.13.9 (Oct 13, 2016)

---

#### Fixes:

- Fixed sorting of layout items, which could be different in IE if two items have the same x & y coordinate.

  - See [#369](https://github.com/STRML/react-grid-layout/issues/369).

    0.13.8 (Oct 13, 2016)

---

#### Fixes:

- Fixed breakage introduced in `0.13.7` when items are added without a layout or `data-grid` property.

  - See [#368](https://github.com/STRML/react-grid-layout/issues/368).

    0.13.7 (Oct 3, 2016)

---

#### Fixes:

- Fixed an error during layout sync if children was a keyed fragment or had nested arrays.
- Fixed `onLayoutChange` being called when layout didn't change.
- Fixed some issues with input layout items being modified in-place rather than cloned.
- Minor typos.

  0.13.6 (Sep 26, 2016)

---

#### Fixes:

- Fixed missing HTMLElement in `onResize*` callbacks.

  0.13.5 (Sep 9, 2016)

---

#### Fixes:

- Fixed a few Flow typing errors in `WidthProvider`.

  0.13.4 (Sep 9, 2016)

---

#### Fixes:

- Fixed potential call to `ReactDOM.findDOMNode(this)` after unmount of `WidthProvider`.
- Fixed an issue where layout items using `data-grid` could rearrange on mount depending on how they were ordered.

  - See [#342](https://github.com/STRML/react-grid-layout/pull/342) for reference.

    0.13.3 (Aug 31, 2016)

---

#### Fixes:

- Fixed `lodash.isequal` import, which was ruined by case-insensitive HFS+ _shakes fist_

  0.13.2 (Aug 31, 2016)

---

#### Fixes:

- Diffing children in order to regenerate the layout now diffs the `key` props and their order.
  - This will catch more changes, such as sorting, addition, and removal.
- Only pass `className` and `style` to WidthProvider. Other props were not intended to be supported.
  - I'm aware this could be a breaking change if you were relying on this bad behavior. If so, please
    use your own `WidthProvider`-style HOC.
- `babel-plugin-transform-flow-comments` had limited support for defining types like transpiled classes.

  - This has been updated to instead copy source to `.js.flow` files, which preserves all type information.

    0.13.1 (Aug 16, 2016)

---

#### Fixes:

- Fix remaining `propTypes` warnings.

  0.13.0 (Aug 3, 2016)

---

#### Changed:

- Due to a change in React 15.2, passing the `_grid` property on DOM children generates an error.
  To compensate, we now error on the same and suggest using `data-grid` instead. Simply change any use of
  `_grid` to `data-grid`, or add your properties to the layout.

#### Fixes:

- Fix React 15.3 warning re: propTypes.

  0.12.7 (Jun 29, 2016)

---

- Prevent extraenous rerenders in `<ResponsiveReactGridLayout>` by using deep equality on layouts.

  0.12.6 (Jun 5, 2016)

---

- Fix blindingly obvious bug where mounted isn't set to true. Smack forehead.

  0.12.5 (Jun 3, 2016)

---

- Fixes for server rendering checksum failures.

  0.12.4 (May 22, 2016)

---

- Update to React-Draggable v2. Fixes: #241, #239, #24

  - v2 contains a number of bugfixes & enhancements for touchscreens, multitouch, and scrolling containers.

    0.12.3 (May 3, 2016)

---

- Bugfix: Rendering with new `breakpoints`/`cols` does not refresh the layout.
  Fixes #208 - thanks @damienleroux

  0.12.2 (May 1, 2016)

---

- Bugfix: Fix warning about undefined `useCSSTransforms` when server-rendering.

  0.12.1 (Apr 19, 2016)

---

- Bugfix: Don't set `layout` twice on width change. See #217 - thanks @damienleroux
- Enhancement: Add Flow type comments

  0.12.0 (Apr 14, 2016)

---

- `<ReactGridLayout>` will no longer animate so severely on mount. See #212.
  - If you are using `<WidthProvider>`, you may notice that the container's width still shunts on mount.
    If you like, you may delay mounting by setting `measureBeforeMount={true}` on the wrapped element. This
    will eliminate the mounting animation completely.
  - If you enjoyed the old animation, set `useCSSTransforms={this.state.mounted}` and toggle the mounting
    flag. See `0-showcase.jsx` for an example.
- Set more permissive version ranges for `<Draggable>` and `<Resizable>` dependencies, as they are now stable
  and will only introduce breaking changes on major version ticks.

  0.11.3 (Apr 8, 2016)

---

- Officially support React v15.

  0.11.2 (Apr 6, 2016)

---

- Bugfix: Draggable cancel selectors, see #203 - thanks @RiiD
- README fixes, thanks @bravo-kernel & @ro-savage

  0.11.1

---

- Bugfix: `<ResponsiveReactGridLayout>` was using stale data when synchronizing children with the layout
  on a breakpoint change.

  0.11.0

---

This release contains potentially breaking changes so I have updated the minor version (as per semver).

**Breaking Changes**:

- Layout items now have a fixed set of properties. Other properties will _not_ be merged into the `<GridItem>`, such
  as `className`. To set a `className` on a child, set it on the child directly and it will be merged.
  This allows us to make better assumptions about the layout and use a faster cloning mechanism.
- Setting individual `handle` and `cancel` selectors per item is no longer supported. If you need this, please
  open a ticket and let me know your use case.

Other changes:

- Bugfix: `<ResponsiveReactGridLayout>` `onLayoutChange` callback data could still be stale.
- Bugfix: Range error when building layout solely from `_grid` properties.
  - This broke a lot of usage and thus `0.10.11` and `0.10.10` have been unpublished.
- Removed redundant `isPlaceholder` property from `<GridItem>`.
- README updates to clarify layout/\_grid usage.

  0.10.11

---

- Bugfix: `layouts` param on `<ResponsiveReactGridLayout>`'s `onLayoutChange` could have stale data
  for the current breakpoint.

  0.10.10

---

- Performance: Prevent V8 deopt in a few methods and add fast layout item cloning.

  0.10.9

---

- Bugfix: Typo in children comparison in CWRP. See #169.
- Bugfix: Missing babel-preset-es2015 in dev.

  0.10.8

---

- Rebuild using [ES2015 Loose Mode](https://babeljs.algolia.com/docs/advanced/loose/).

  0.10.7

---

- Bugfix: `className` and `style` props on grid children were being incorrectly dropped, a holdover
  from when `cloneWithProps()` used to do this merging for us. They are now merged.

  0.10.6

---

- Bugfix: If both `props.layout` and `props.children.length` change in the same tick,
  props.layout would be clobbered. See #162

  0.10.5

---

- Bugfix/Enhancement: Margins were causing subtle error in some of the positioning calculations. This has
  been fixed.

  0.10.4

---

- Bugfix: Container height was calculated as less than expected due to improper addition of margin.

  0.10.3

---

- Bugfix: Round item positions even if they're currently resizing or dragging (#158, regression of #141)
- Bugfix: Fix a positioning bug when margins are 0 (#160)

  0.10.2

---

- Bugfix: <RGL> would synchronize children with layout if the layout in props didn't match the state;
  this was meant to be a hook for the developer to supply a new layout. The incorrect check could cause the
  layout to reset if the parent rerendered. The check is now between the layout in nextProps and props.
- Bugfix: Fixed a lot of resizing layout bugs; most of the fixes are in react-resizable.
- Bugfix: Fixed incorrect typecheck on LayoutItem.i.
- Bugfix: Make onLayoutChange fire appropriately (#155).
- Bugfix: Fix `<ResponsiveGridLayout>` not properly reverting when sizing the page up (#154).
- Remove unused `offsetX` and `offsetY` from layouts.
- Dependency updates.

  0.10.1

---

- Hotfix for default export incompatibility caused by Babel 6.

  0.10.0

---

This long-awaited release provides React 0.14 compatibility and a rewrite of the underlying
`<Draggable>` functionality.

**Breaking changes:**

- `ListensToWidth` replaced with `WidthProvider` which must wrap
  `<ResponsiveReactGridLayout>` and `<ReactGridLayout>` to provide width data. See doc for example.
- Prop `initialWidth` renamed to `width`.
- Grid Layout keys must be type of string now.

Other changes:

- _Finally_ compatible with React 0.14! Big thanks to @menelike for his help.
- Upgraded to Babel 6.
- Full typechecking via Flow.
- Lots of misc bugfixes.

  - See beta releases below for more details.

    0.10.0-beta1

---

- Fixed a React import bug on ListensToWidth.jsx (#130; thanks @mrblueblue)

  0.10.0-beta0

---

_This release is unstable!_

- React 0.14 compatibility.
- This release includes a rewrite of much of the project in ES6/7 style with Flow typing.
- This release brings us onto mainline (1.x) react-draggable and react-resizable, eliminating
  the previous github dependency.
- 0.10.0 is not yet complete. Use this release at your own risk.

Known bugs:

- The placeholder box does not properly follow the mouse and stays pinned to the active drag.

## 0.9.2

- Update `react-draggable` to `v0.8.0` to fix IE11 issues (#29).

  0.9.1

---

- Update `react-draggable` to `v0.7.3` to fix a bounds bug (#56).

  0.9.0

---

- Move off `react-draggable` fork to mainline `v0.7.2`. Incremented minor (major in the case of
  npm's `^`, since we are pre-v1) version in case of unforeseen conflicts.

  0.8.3

---

- Add `verticalCompact` toggle.

  0.8.2

---

- Fix a crash when initializing with no children.

  0.8.1

---

- Fixed React 0.13 warning about `isMounted()`.
- Update to babel 5.
- Added browser build for use with a `<script>` tag or in RequireJS builds.
- Pinned react-draggable version in anticipation of React 0.13 update.

  0.8.0

---

- Changed signature on resize/drag callbacks to allow dynamic max/min W/H per item.
- Fixed bug in `useCSSTransforms`.
- Documentation and example fixes.

  0.7.1

---

- Added callbacks for resize and drag start/active/stop.

  0.7.0

---

**Breaking changes:**

- `ReactGridLayout.props.handle` renamed to `ReactGridLayout.props.draggableHandle`.

> This version contains a CSS update. This fixes a visual bug where you may see items quickly reset position
> and animate back to their original position on load, when you are using CSS transforms. To fix this bug,
> copy the rules from css/styles.css into your stylesheet.

Other changes:

- Fixed #19 (bad new item placement with css transforms).
- Fixed some placement inconsistencies while RGL is mounting, with css transforms and percentages.
- Fixed a duplicate className bug.

  0.6.2

---

- Fix #21 (error when passing only a single child).
- Add GridItem.props.cancel.
- Use React addons directly to save file size.
- Allow setting draggable/resizable per grid item, as well as existing `static` property.
- Use object.assign to set `_grid` properties so we can more easily merge PRs in the future.

  0.6.1

---

- Fixed #8 (current layout was not properly being stored when provided via \_grid props).

  0.6.0

---

- Optionally use CSS transforms for placement, fallback on position top/left.
- Allow parent to set responsive breakpoint directly.

  0.5.2

---

- Fix Responsive import for node users

  0.5.1

---

- Add support for min/max dimension attributes.
- Example tweak

  0.5.0

---

- Refactoring and demo tweaks. Update README with new params.
- Add showcase example, tweak template
- Refactor: Responsive Grid Layout is a separate element
- Auto-generate examples from template rather than edit them individually.

  0.4.0

---

- Force lodash into commons chunk
- More tweaks to grid collisions. This should fix bad swaps once and for all.
- Set unused:"vars" in lint.
- Add responsive localstorage example and `initialLayouts` support.
- Fix localstorage example comment.
- Rework responsive layouts, identify child elements by key rather than index. Added 2 new examples.
- Fixup GridItem resizing feel a bit.

## < 0.4.0

- Early development versions, too many changes to list.
