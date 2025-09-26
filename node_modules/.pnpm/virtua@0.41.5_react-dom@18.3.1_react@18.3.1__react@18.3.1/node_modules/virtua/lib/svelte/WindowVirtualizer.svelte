<script lang="ts" generics="T">
  import { onMount, onDestroy } from "svelte";
  import {
    ACTION_ITEMS_LENGTH_CHANGE,
    type StateVersion,
    UPDATE_SCROLL_END_EVENT,
    UPDATE_SCROLL_EVENT,
    UPDATE_VIRTUAL_STATE,
    createVirtualStore,
    getScrollSize as _getScrollSize,
    createWindowResizer,
    createWindowScroller,
  } from "../core";
  import { defaultGetKey, iterRange, styleToString } from "./utils";
  import ListItem from "./ListItem.svelte";
  import type {
    WindowVirtualizerHandle,
    WindowVirtualizerProps,
  } from "./WindowVirtualizer.type";

  interface Props extends WindowVirtualizerProps<T> {}

  let {
    data,
    getKey = defaultGetKey,
    overscan,
    itemSize,
    shift = false,
    horizontal = false,
    children,
    onscroll,
    onscrollend,
  }: Props = $props();

  const store = createVirtualStore(
    data.length,
    itemSize,
    overscan,
    undefined,
    undefined,
    !itemSize
  );
  const resizer = createWindowResizer(store, horizontal);
  const scroller = createWindowScroller(store, horizontal);
  const unsubscribeStore = store.$subscribe(UPDATE_VIRTUAL_STATE, () => {
    stateVersion = store.$getStateVersion();
  });

  const unsubscribeOnScroll = store.$subscribe(UPDATE_SCROLL_EVENT, () => {
    // https://github.com/inokawa/virtua/discussions/580
    onscroll && onscroll();
  });
  const unsubscribeOnScrollEnd = store.$subscribe(
    UPDATE_SCROLL_END_EVENT,
    () => {
      onscrollend && onscrollend();
    }
  );

  let containerRef: HTMLDivElement | undefined = $state();

  let stateVersion: StateVersion = $state(store.$getStateVersion());

  let range = $derived(stateVersion && store.$getRange());
  let isScrolling = $derived(stateVersion && store.$isScrolling());
  let totalSize = $derived(stateVersion && store.$getTotalSize());

  onMount(() => {
    resizer.$observeRoot(containerRef!);
    scroller.$observe(containerRef!);
  });
  onDestroy(() => {
    unsubscribeStore();
    unsubscribeOnScroll();
    unsubscribeOnScrollEnd();
    resizer.$dispose();
    scroller.$dispose();
  });

  $effect.pre(() => {
    if (data.length !== store.$getItemsLength()) {
      store.$update(ACTION_ITEMS_LENGTH_CHANGE, [data.length, shift]);
    }
  });

  let prevStateVersion: StateVersion | undefined;
  $effect(() => {
    if (prevStateVersion === stateVersion) return;
    prevStateVersion = stateVersion;
    scroller.$fixScrollJump();
  });

  export const findStartIndex =
    store.$findStartIndex satisfies WindowVirtualizerHandle["findStartIndex"] as WindowVirtualizerHandle["findStartIndex"];
  export const findEndIndex =
    store.$findEndIndex satisfies WindowVirtualizerHandle["findEndIndex"] as WindowVirtualizerHandle["findEndIndex"];
  export const scrollToIndex =
    scroller.$scrollToIndex satisfies WindowVirtualizerHandle["scrollToIndex"] as WindowVirtualizerHandle["scrollToIndex"];

  let containerStyle = $derived(
    styleToString({
      // contain: "content",
      "overflow-anchor": "none", // opt out browser's scroll anchoring because it will conflict to scroll anchoring of virtualizer
      flex: "none", // flex style can break layout
      position: "relative",
      visibility: "hidden", // TODO replace with other optimization methods
      width: horizontal ? totalSize + "px" : "100%",
      height: horizontal ? "100%" : totalSize + "px",
      "pointer-events": isScrolling ? "none" : undefined,
    })
  );
</script>

<!-- 
  @component
  {@link Virtualizer} controlled by the window scrolling. See {@link WindowVirtualizerProps} and {@link WindowVirtualizerHandle}.
-->
<div bind:this={containerRef} style={containerStyle}>
  {#each iterRange(range) as index (getKey(data[index]!, index))}
    {@const item = data[index]!}
    <ListItem
      {children}
      {item}
      {index}
      as="div"
      offset={stateVersion && store.$getItemOffset(index)}
      hide={stateVersion && store.$isUnmeasuredItem(index)}
      {horizontal}
      resizer={resizer.$observeItem}
    />
  {/each}
</div>
