https://github.com/emilkowalski/vaul/assets/36730035/fdf8c5e8-ade8-433b-8bb0-4ce10e722516

Vaul is an unstyled drawer component for React that can be used as a Dialog replacement on tablet and mobile devices. You can read about why and how it was built [here](https://emilkowal.ski/ui/building-a-drawer-component).

## Usage

To start using the library, install it in your project:,

```bash
npm install vaul
```

Use the drawer in your app.

```jsx
import { Drawer } from 'vaul';

function MyComponent() {
  return (
    <Drawer.Root>
      <Drawer.Trigger>Open</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Content>
          <p>Content</p>
        </Drawer.Content>
        <Drawer.Overlay />
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

## Examples

Play around with the examples on codesandbox:

- [With scaled background](https://codesandbox.io/p/sandbox/drawer-with-scale-g24vvh?file=%2Fapp%2Fmy-drawer.tsx%3A1%2C1)
- [Without scaled background](https://codesandbox.io/p/sandbox/drawer-with-scale-forked-nx2glp?file=%2Fapp%2Fmy-drawer.tsx%3A4%2C1)
- [With snap points](https://codesandbox.io/p/sandbox/drawer-non-dismissable-forked-jchtff?file=/app/my-drawer.tsx:1,1)
- [Scrollable with inputs](https://codesandbox.io/p/sandbox/drawer-with-scale-forked-73f8jw?file=%2Fapp%2Fmy-drawer.tsx%3A1%2C1)
- [Drawer from right instead of bottom](https://codesandbox.io/p/devbox/drawer-direction-right-n338ml?file=%2Fapp%2Fmy-drawer.tsx%3A47%2C2)
- [Nested drawers](https://codesandbox.io/p/sandbox/drawer-non-dismissable-forked-5z2r3j?file=%2Fapp%2Fmy-drawer.tsx%3A49%2C16-49%2C246)
- [Non-dismissible](https://codesandbox.io/p/sandbox/drawer-without-scale-forked-kxh9j5?file=%2Fapp%2Fmy-drawer.tsx%3A1%2C1)
- [Non-draggable element](https://codesandbox.io/p/devbox/drawer-with-scale-forked-hwtfws?file=%2Fapp%2Fmy-drawer.tsx%3A42%2C37)

## API Reference

### Root

Contains all parts of a dialog. Use `shouldScaleBackground` to enable background scaling, it requires an element with `[data-vaul-drawer-wrapper]` data attribute to scale its background.
Can be controlled with the `value` and `onOpenChange` props. Can be opened by default via the `open` prop.

Additional props:

`closeThreshold`: Number between 0 and 1 that determines when the drawer should be closed. Example: threshold of 0.5 would close the drawer if the user swiped for 50% of the height of the drawer or more.

`scrollLockTimeout`: Duration for which the drawer is not draggable after scrolling content inside of the drawer. Defaults to 500ms.

`snapPoints`: Array of numbers from 0 to 100 that corresponds to % of the screen a given snap point should take up. Should go from least visible. Example `[0.2, 0.5, 0.8]`. You can also use px values, which doesn't take screen height into account.

`fadeFromIndex`: Index of a `snapPoint` from which the overlay fade should be applied. Defaults to the last snap point.

`modal`: When `false` it allows to interact with elements outside of the drawer without closing it. Defaults to `true`.

`direction`: Direction of the drawer. Can be `top` or `bottom`, `left`, `right`. Defaults to `bottom`.

`repositionInputs`: When `true` Vaul will reposition inputs rather than scroll then into view if the keyboard is in the way. Setting it to `false` will fall back to the default browser behavior.

`noBodyStyles`: When `true` the `body` doesn't get any styles assigned from Vaul.

`handleOnly`: When `true` only allows the drawer to be dragged by the `<Drawer.Handle />` component. Defaults to `false`.

`setBackgroundColorOnScale`: When `false` we don't change body's background color when the drawer is open. `true` by default.

`defaultOpen`: Opened by default, still reacts to `open` state changes.

`dismissible`: When `false` dragging, clicking outside, pressing esc, etc. will not close the drawer. Use this in comination with the `open` prop, otherwise you won't be able to open/close the drawer.

`snapToSequentialPoint`: Disabled velocity based swiping for snap points. This means that a snap point won't be skipped even if the velocity is high enough. Useful if each snap point in a drawer is equally important.

`onAnimationEnd`: Gets triggered after the open or close animation ends, it receives an `open` argument with the `open` state of the drawer by the time the function was triggered. Useful to revert any state changes for example.

`[data-vaul-no-drag]`: When interacting with an element with this data attribute, the drawer won't be dragged.

### Controlled Drawer

Drawer can be controlled programmatically by providing the `open` prop. If you want to react to open state changes from within the Drawer use the `onOpenChange` prop, this will allow you to provide your own open state while still closing the drawer when the escape key is pressed for example.

```
const [open, setOpen] = React.useState(false);

// ...

<Drawer.Root open={open} onOpenChange={setOpen}>
  // ...
</Drawer.Root>
```

### Custom Container

Customize the element that your drawer portals into. By default, drawer will be appended to `document.body`.

```tsx
import React from 'react';
import { Drawer } from 'vaul';

export default () => {
  const [container, setContainer] = React.useState(null);

  return (
    <div>
      <Drawer.Root container={container}>
        <Drawer.Trigger />
        <Drawer.Portal>
          <Drawer.Overlay />
          <Drawer.Content>...</Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      // Drawer will be rendered inside this div.
      <div ref={setContainer} />
    </div>
  );
};
```

### Handle

A drag hint (also known as grabber). Shows people that they can drag the drawer; they can also tap it to cycle through the snap points, and double tap quickly to close the drawer.

```jsx
import { Drawer } from 'vaul';

function MyComponent() {
  return (
    <Drawer.Root>
      <Drawer.Trigger>Open</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Content>
          <Drawer.Handle />
          <p>Content</p>
        </Drawer.Content>
        <Drawer.Overlay />
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

### Trigger

The button that opens the dialog. [Props](https://www.radix-ui.com/docs/primitives/components/dialog#trigger).

### Content

Content that should be rendered in the drawer. [Props](https://www.radix-ui.com/docs/primitives/components/dialog#content).

### Overlay

A layer that covers the inert portion of the view when the dialog is open. [Props](https://www.radix-ui.com/docs/primitives/components/dialog#overlay).

### Title

An accessible title to be announced when the dialog is opened. [Props](https://www.radix-ui.com/docs/primitives/components/dialog#title).

### Description

An optional accessible description to be announced when the dialog is opened. [Props](https://www.radix-ui.com/docs/primitives/components/dialog#description).

### Close

The button that closes the dialog. [Props](https://www.radix-ui.com/docs/primitives/components/dialog#close).

### Portal

Portals your drawer into the body.

### CSS File

CSS in this library is inserted by JavaScript into `<head>` element by default. If you're having issue with it such as [CSP restriction](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src), you can use `vaul/style.css` CSS as a workaround to apply the styles.

> Note: You don't need to import it unless the default inline styles is blocked by CSP.
