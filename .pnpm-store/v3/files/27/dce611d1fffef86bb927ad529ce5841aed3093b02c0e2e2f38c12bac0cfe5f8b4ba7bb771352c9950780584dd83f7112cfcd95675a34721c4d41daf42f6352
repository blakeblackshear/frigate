# use-editable

## 2.3.1

- Fix Chrome quirk where initial focus would immediately lose its selected range by switching to `selectstart` and checking for `window.getSelection().rangeCount`
  (See [`71ae9a2`](https://github.com/kitten/use-editable/commit/71ae9a20bdf09b1bff8b6cb9ee460b5f828ffa69))

## 2.3.0

- Add `Edit#getState()` method to returned `Edit` handle. `useEditable` returns the `Edit` object with several methods to allow manipulating the current editable.
  The `getState()` method allows you to retrieve the current text and position of the editable.
  (See [`98cb706`](https://github.com/kitten/use-editable/commit/98cb70625f35254c0e349f129a05edb43d39a3c3))

## 2.2.2

- Fix regression from `2.2.1`, which would misplace the indentation pattern and not recognise lines with content when backspace is pressed.
  (See [`bc2be15`](https://github.com/kitten/use-editable/commit/bc2be1530e1d85949bd9300d62547ed62e04e43a))

## 2.2.1

- Add space-only indentation when `opts.indentation` is passed. This means that `useEditable` now inserts spaces over tabs when `opts.indentation` is set and overrides the
  default backspace behaviour to delete multiple spaces as needed.
  (See [`9291f6c`](https://github.com/kitten/use-editable/commit/9291f6ccdb9a6cfcfba38f59ead89a2024ec2bee))

## 2.2.0

- Add `Edit#move()` method to edit the caret position programmatically. The caret can now be moved to a specific character index or row/column coordinates.
  (See [`15cea68`](https://github.com/kitten/use-editable/commit/15cea6817242e30deb8bda9996060b9dd11db1ab))

## 2.1.2

- Fix undo/redo key combination, which regressed previously, since it was switched to `event.key` rather than `event.code`
  (See [`7147dca`](https://github.com/kitten/use-editable/commit/7147dcaa70e389ad9e0cdc6f92f76f6f6bcd724d))
- Fix changes from being flushed to eagerly, which was meant to preserve the selected ranges more eagerly
  (See [`1feaec5`](https://github.com/kitten/use-editable/commit/1feaec57e72c0edbefaf81464856656662baf89c))

## 2.1.1

- Fix key repeats (held keys) not flushing changes correctly
  (See [`3807bbf`](https://github.com/kitten/use-editable/commit/3807bbf6c143259d46cba52becf2c4f100fb6f69))

## 2.1.0

- Support non-collpsed selection restoration, in other words, when a range is selected and the component updates in the meantime, the selection is restored correctly.
  This is achieved by storing the selection's "extent", i.e. the number of characters it selects past its start.
  (See [`a15f8fc`](https://github.com/kitten/use-editable/commit/a15f8fcd9c1731c98c1ee2d96b6b0ed19ad40355))

## 2.0.2

- Fix inconsistency of deletion behaviour on the beginning of lines. Due to the lack of `plaintext-only` support in Firefox,
  computing the current position would be relative to the root element, when plain text is selected. This makes it extremely difficult
  to get the current position without small offsets.
  (See [`1644f51`](https://github.com/kitten/use-editable/commit/1644f516ad7d4f3367f4fa9fad41268dd9084ddc))

## 2.0.1

- Fix `onChange` not being triggered when the cursor moves
  (See [`9dfadda`](https://github.com/kitten/use-editable/commit/9dfadda649e7f4d2b850a7d90ddc0ed62f81a041))

## 2.0.0

- Add `Edit` return value to `useEditable`. The `useEditable` hook now returns an object with multiple methods that may be useful
  for controlling the editable's content, behaviour and cursor. Specifically it returns `Edit#update`, which was its previous return value
  for updating its content, and `Edit#insert` to append new text.
  (See [`c031d7e`](https://github.com/kitten/use-editable/commit/c031d7ee3e2551f6230df7fae0b03a3ce287d202))
