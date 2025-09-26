import { mergeProps, createEffect, onCleanup, createMemo, createSignal, onMount, createComputed, on, untrack, For, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

/** @internal */
const NULL = null;
/** @internal */
const { min, max, abs, floor } = Math;
/**
 * @internal
 */
const clamp = (value, minValue, maxValue) => min(maxValue, max(minValue, value));
/**
 * @internal
 */
const sort = (arr) => {
    return [...arr].sort((a, b) => a - b);
};
/**
 * @internal
 */
const microtask = typeof queueMicrotask === "function"
    ? queueMicrotask
    : (fn) => {
        Promise.resolve().then(fn);
    };
/**
 * @internal
 */
const once = (fn) => {
    let cache;
    return () => {
        if (fn) {
            cache = fn();
            fn = undefined;
        }
        return cache;
    };
};

/** @internal */
const UNCACHED = -1;
const fill = (array, length, prepend) => {
    const key = prepend ? "unshift" : "push";
    for (let i = 0; i < length; i++) {
        array[key](UNCACHED);
    }
    return array;
};
/**
 * @internal
 */
const getItemSize = (cache, index) => {
    const size = cache._sizes[index];
    return size === UNCACHED ? cache._defaultItemSize : size;
};
/**
 * @internal
 */
const setItemSize = (cache, index, size) => {
    const isInitialMeasurement = cache._sizes[index] === UNCACHED;
    cache._sizes[index] = size;
    // mark as dirty
    cache._computedOffsetIndex = min(index, cache._computedOffsetIndex);
    return isInitialMeasurement;
};
/**
 * @internal
 */
const computeOffset = (cache, index) => {
    if (!cache._length)
        return 0;
    if (cache._computedOffsetIndex >= index) {
        return cache._offsets[index];
    }
    if (cache._computedOffsetIndex < 0) {
        // first offset must be 0 to avoid returning NaN, which can cause infinite rerender.
        // https://github.com/inokawa/virtua/pull/160
        cache._offsets[0] = 0;
        cache._computedOffsetIndex = 0;
    }
    let i = cache._computedOffsetIndex;
    let top = cache._offsets[i];
    while (i < index) {
        top += getItemSize(cache, i);
        cache._offsets[++i] = top;
    }
    // mark as measured
    cache._computedOffsetIndex = index;
    return top;
};
/**
 * @internal
 */
const computeTotalSize = (cache) => {
    if (!cache._length)
        return 0;
    return (computeOffset(cache, cache._length - 1) +
        getItemSize(cache, cache._length - 1));
};
/**
 * Finds the index of an item in the cache whose computed offset is closest to the specified offset.
 *
 * @internal
 */
const findIndex = (cache, offset, low = 0, high = cache._length - 1) => {
    // Find with binary search
    while (low <= high) {
        const mid = floor((low + high) / 2);
        const itemOffset = computeOffset(cache, mid);
        if (itemOffset <= offset) {
            if (itemOffset + getItemSize(cache, mid) > offset) {
                return mid;
            }
            low = mid + 1;
        }
        else {
            high = mid - 1;
        }
    }
    return clamp(low, 0, cache._length - 1);
};
/**
 * @internal
 */
const computeRange = (cache, scrollOffset, viewportSize, prevStartIndex) => {
    // Clamp because prevStartIndex may exceed the limit when children decreased a lot after scrolling
    prevStartIndex = min(prevStartIndex, cache._length - 1);
    if (computeOffset(cache, prevStartIndex) <= scrollOffset) {
        // search forward
        // start <= end, prevStartIndex <= start
        const end = findIndex(cache, scrollOffset + viewportSize, prevStartIndex);
        return [findIndex(cache, scrollOffset, prevStartIndex, end), end];
    }
    else {
        // search backward
        // start <= end, start <= prevStartIndex
        const start = findIndex(cache, scrollOffset, undefined, prevStartIndex);
        return [start, findIndex(cache, scrollOffset + viewportSize, start)];
    }
};
/**
 * @internal
 */
const estimateDefaultItemSize = (cache, startIndex) => {
    let measuredCountBeforeStart = 0;
    // This function will be called after measurement so measured size array must be longer than 0
    const measuredSizes = [];
    cache._sizes.forEach((s, i) => {
        if (s !== UNCACHED) {
            measuredSizes.push(s);
            if (i < startIndex) {
                measuredCountBeforeStart++;
            }
        }
    });
    // Discard cache for now
    cache._computedOffsetIndex = -1;
    // Calculate median
    const sorted = sort(measuredSizes);
    const len = sorted.length;
    const mid = (len / 2) | 0;
    const median = len % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const prevDefaultItemSize = cache._defaultItemSize;
    // Calculate diff of unmeasured items before start
    return (((cache._defaultItemSize = median) - prevDefaultItemSize) *
        max(startIndex - measuredCountBeforeStart, 0));
};
/**
 * @internal
 */
const initCache = (length, itemSize, snapshot) => {
    return {
        _defaultItemSize: snapshot ? snapshot[1] : itemSize,
        _sizes: snapshot && snapshot[0]
            ? // https://github.com/inokawa/virtua/issues/441
                fill(snapshot[0].slice(0, min(length, snapshot[0].length)), max(0, length - snapshot[0].length))
            : fill([], length),
        _length: length,
        _computedOffsetIndex: -1,
        _offsets: fill([], length),
    };
};
/**
 * @internal
 */
const takeCacheSnapshot = (cache) => {
    return [cache._sizes.slice(), cache._defaultItemSize];
};
/**
 * @internal
 */
const updateCacheLength = (cache, length, isShift) => {
    const diff = length - cache._length;
    cache._computedOffsetIndex = isShift
        ? // Discard cache for now
            -1
        : min(length - 1, cache._computedOffsetIndex);
    cache._length = length;
    if (diff > 0) {
        // Added
        fill(cache._offsets, diff);
        fill(cache._sizes, diff, isShift);
        return cache._defaultItemSize * diff;
    }
    else {
        // Removed
        cache._offsets.splice(diff);
        return (isShift ? cache._sizes.splice(0, -diff) : cache._sizes.splice(diff)).reduce((acc, removed) => acc - (removed === UNCACHED ? cache._defaultItemSize : removed), 0);
    }
};

/**
 * @internal
 */
const isBrowser = typeof window !== "undefined";
const getDocumentElement = () => document.documentElement;
/**
 * @internal
 */
const getCurrentDocument = (node) => node.ownerDocument;
/**
 * @internal
 */
const getCurrentWindow = (doc) => doc.defaultView;
/**
 * @internal
 */
const isRTLDocument = /*#__PURE__*/ once(() => {
    // TODO support SSR in rtl
    return isBrowser
        ? getComputedStyle(getDocumentElement()).direction === "rtl"
        : false;
});
/**
 * Currently, all browsers on iOS/iPadOS are WebKit, including WebView.
 * @internal
 */
const isIOSWebKit = /*#__PURE__*/ once(() => {
    return /iP(hone|od|ad)/.test(navigator.userAgent);
});
/**
 * @internal
 */
const isSmoothScrollSupported = /*#__PURE__*/ once(() => {
    return "scrollBehavior" in getDocumentElement().style;
});

const MAX_INT_32 = 0x7fffffff;
const SCROLL_IDLE = 0;
const SCROLL_DOWN = 1;
const SCROLL_UP = 2;
const SCROLL_BY_NATIVE = 0;
const SCROLL_BY_MANUAL_SCROLL = 1;
const SCROLL_BY_SHIFT = 2;
/** @internal */
const ACTION_SCROLL = 1;
/** @internal */
const ACTION_SCROLL_END = 2;
/** @internal */
const ACTION_ITEM_RESIZE = 3;
/** @internal */
const ACTION_VIEWPORT_RESIZE = 4;
/** @internal */
const ACTION_ITEMS_LENGTH_CHANGE = 5;
/** @internal */
const ACTION_START_OFFSET_CHANGE = 6;
/** @internal */
const ACTION_MANUAL_SCROLL = 7;
/** @internal */
const ACTION_BEFORE_MANUAL_SMOOTH_SCROLL = 8;
/** @internal */
const UPDATE_VIRTUAL_STATE = 0b0001;
/** @internal */
const UPDATE_SIZE_EVENT = 0b0010;
/** @internal */
const UPDATE_SCROLL_EVENT = 0b0100;
/** @internal */
const UPDATE_SCROLL_END_EVENT = 0b1000;
/**
 * @internal
 */
const getScrollSize = (store) => {
    return max(store.$getTotalSize(), store.$getViewportSize());
};
/**
 * @internal
 */
const isInitialMeasurementDone = (store) => {
    return !!store.$getViewportSize();
};
/**
 * @internal
 */
const createVirtualStore = (elementsCount, itemSize = 40, overscan = 4, ssrCount = 0, cacheSnapshot, shouldAutoEstimateItemSize = false) => {
    let isSSR = !!ssrCount;
    let stateVersion = 1;
    let viewportSize = 0;
    let startSpacerSize = 0;
    let scrollOffset = 0;
    let jump = 0;
    let pendingJump = 0;
    let _flushedJump = 0;
    let _scrollDirection = SCROLL_IDLE;
    let _scrollMode = SCROLL_BY_NATIVE;
    let _frozenRange = isSSR
        ? [0, max(ssrCount - 1, 0)]
        : NULL;
    let _prevRange = [0, 0];
    let _totalMeasuredSize = 0;
    const cache = initCache(elementsCount, itemSize, cacheSnapshot);
    const subscribers = new Set();
    const getRelativeScrollOffset = () => scrollOffset - startSpacerSize;
    const getVisibleOffset = () => getRelativeScrollOffset() + pendingJump + jump;
    const getRange = (offset) => {
        return computeRange(cache, offset, viewportSize, _prevRange[0]);
    };
    const getTotalSize = () => computeTotalSize(cache);
    const getItemOffset = (index) => {
        return computeOffset(cache, index) - pendingJump;
    };
    const getItemSize$1 = (index) => {
        return getItemSize(cache, index);
    };
    const applyJump = (j) => {
        if (j) {
            // In iOS WebKit browsers, updating scroll position will stop scrolling so it have to be deferred during scrolling.
            if (isIOSWebKit() && _scrollDirection !== SCROLL_IDLE) {
                pendingJump += j;
            }
            else {
                jump += j;
            }
        }
    };
    return {
        $getStateVersion: () => stateVersion,
        $getCacheSnapshot: () => {
            return takeCacheSnapshot(cache);
        },
        $getRange: () => {
            let startIndex;
            let endIndex;
            if (_flushedJump) {
                // Return previous range for consistent render until next scroll event comes in.
                // And it must be clamped. https://github.com/inokawa/virtua/issues/597
                [startIndex, endIndex] = _prevRange;
            }
            else {
                [startIndex, endIndex] = _prevRange = getRange(max(0, getVisibleOffset()));
                if (_frozenRange) {
                    startIndex = min(startIndex, _frozenRange[0]);
                    endIndex = max(endIndex, _frozenRange[1]);
                }
            }
            if (_scrollDirection !== SCROLL_DOWN) {
                startIndex -= max(0, overscan);
            }
            if (_scrollDirection !== SCROLL_UP) {
                endIndex += max(0, overscan);
            }
            return [max(startIndex, 0), min(endIndex, cache._length - 1)];
        },
        $findStartIndex: () => findIndex(cache, getVisibleOffset()),
        $findEndIndex: () => findIndex(cache, getVisibleOffset() + viewportSize),
        $isUnmeasuredItem: (index) => cache._sizes[index] === UNCACHED,
        _hasUnmeasuredItemsInFrozenRange: () => {
            if (!_frozenRange)
                return false;
            return cache._sizes
                .slice(max(0, _frozenRange[0] - 1), min(cache._length - 1, _frozenRange[1] + 1) + 1)
                .includes(UNCACHED);
        },
        $getItemOffset: getItemOffset,
        $getItemSize: getItemSize$1,
        $getItemsLength: () => cache._length,
        $getScrollOffset: () => scrollOffset,
        $isScrolling: () => _scrollDirection !== SCROLL_IDLE,
        $getViewportSize: () => viewportSize,
        $getStartSpacerSize: () => startSpacerSize,
        $getTotalSize: getTotalSize,
        _flushJump: () => {
            _flushedJump = jump;
            jump = 0;
            return [
                _flushedJump,
                // Use absolute position not to exceed scrollable bounds
                _scrollMode === SCROLL_BY_SHIFT ||
                    // https://github.com/inokawa/virtua/discussions/475
                    getRelativeScrollOffset() + viewportSize >= getTotalSize(),
            ];
        },
        $subscribe: (target, cb) => {
            const sub = [target, cb];
            subscribers.add(sub);
            return () => {
                subscribers.delete(sub);
            };
        },
        $update: (type, payload) => {
            let shouldFlushPendingJump;
            let shouldSync;
            let mutated = 0;
            switch (type) {
                case ACTION_SCROLL: {
                    const flushedJump = _flushedJump;
                    _flushedJump = 0;
                    const delta = payload - scrollOffset;
                    const distance = abs(delta);
                    // Scroll event after jump compensation is not reliable because it may result in the opposite direction.
                    // The delta of artificial scroll may not be equal with the jump because it may be batched with other scrolls.
                    // And at least in latest Chrome/Firefox/Safari in 2023, setting value to scrollTop/scrollLeft can lose subpixel because its integer (sometimes float probably depending on dpr).
                    const isJustJumped = flushedJump && distance < abs(flushedJump) + 1;
                    // Scroll events are dispatched enough so it's ok to skip some of them.
                    if (!isJustJumped &&
                        // Ignore until manual scrolling
                        _scrollMode === SCROLL_BY_NATIVE) {
                        _scrollDirection = delta < 0 ? SCROLL_UP : SCROLL_DOWN;
                    }
                    // TODO This will cause glitch in reverse infinite scrolling. Disable this until better solution is found.
                    // if (
                    //   pendingJump &&
                    //   ((_scrollDirection === SCROLL_UP &&
                    //     payload - max(pendingJump, 0) <= 0) ||
                    //     (_scrollDirection === SCROLL_DOWN &&
                    //       payload - min(pendingJump, 0) >= getScrollOffsetMax()))
                    // ) {
                    //   // Flush if almost reached to start or end
                    //   shouldFlushPendingJump = true;
                    // }
                    if (isSSR) {
                        _frozenRange = NULL;
                        isSSR = false;
                    }
                    scrollOffset = payload;
                    mutated = UPDATE_SCROLL_EVENT;
                    // Skip if offset is not changed
                    // Scroll offset may exceed min or max especially in Safari's elastic scrolling.
                    const relativeOffset = getRelativeScrollOffset();
                    if (relativeOffset >= -viewportSize &&
                        relativeOffset <= getTotalSize()) {
                        mutated += UPDATE_VIRTUAL_STATE;
                        // Update synchronously if scrolled a lot
                        shouldSync = distance > viewportSize;
                    }
                    break;
                }
                case ACTION_SCROLL_END: {
                    mutated = UPDATE_SCROLL_END_EVENT;
                    if (_scrollDirection !== SCROLL_IDLE) {
                        shouldFlushPendingJump = true;
                        mutated += UPDATE_VIRTUAL_STATE;
                    }
                    _scrollDirection = SCROLL_IDLE;
                    _scrollMode = SCROLL_BY_NATIVE;
                    _frozenRange = NULL;
                    break;
                }
                case ACTION_ITEM_RESIZE: {
                    const updated = payload.filter(([index, size]) => cache._sizes[index] !== size);
                    // Skip if all items are cached and not updated
                    if (!updated.length) {
                        break;
                    }
                    // Calculate jump by resize to minimize junks in appearance
                    applyJump(updated.reduce((acc, [index, size]) => {
                        if (
                        // Keep distance from end during shifting
                        _scrollMode === SCROLL_BY_SHIFT ||
                            (_frozenRange
                                ? // https://github.com/inokawa/virtua/issues/380
                                    // https://github.com/inokawa/virtua/issues/590
                                    !isSSR && index < _frozenRange[0]
                                : // Otherwise we should maintain visible position
                                    getItemOffset(index) +
                                        // https://github.com/inokawa/virtua/issues/385
                                        (_scrollDirection === SCROLL_IDLE &&
                                            _scrollMode === SCROLL_BY_NATIVE
                                            ? getItemSize$1(index)
                                            : 0) <
                                        getRelativeScrollOffset())) {
                            acc += size - getItemSize$1(index);
                        }
                        return acc;
                    }, 0));
                    // Update item sizes
                    for (const [index, size] of updated) {
                        const prevSize = getItemSize$1(index);
                        const isInitialMeasurement = setItemSize(cache, index, size);
                        if (shouldAutoEstimateItemSize) {
                            _totalMeasuredSize += isInitialMeasurement
                                ? size
                                : size - prevSize;
                        }
                    }
                    // Estimate initial item size from measured sizes
                    if (shouldAutoEstimateItemSize &&
                        viewportSize &&
                        // If the total size is lower than the viewport, the item may be a empty state
                        _totalMeasuredSize > viewportSize) {
                        applyJump(estimateDefaultItemSize(cache, findIndex(cache, getVisibleOffset())));
                        shouldAutoEstimateItemSize = false;
                    }
                    mutated = UPDATE_VIRTUAL_STATE + UPDATE_SIZE_EVENT;
                    // Synchronous update is necessary in current design to minimize visible glitch in concurrent rendering.
                    // However this seems to be the main cause of the errors from ResizeObserver.
                    // https://github.com/inokawa/virtua/issues/470
                    //
                    // And in React, synchronous update with flushSync after asynchronous update will overtake the asynchronous one.
                    // If items resize happens just after scroll, race condition can occur depending on implementation.
                    shouldSync = true;
                    break;
                }
                case ACTION_VIEWPORT_RESIZE: {
                    if (viewportSize !== payload) {
                        viewportSize = payload;
                        mutated = UPDATE_VIRTUAL_STATE + UPDATE_SIZE_EVENT;
                    }
                    break;
                }
                case ACTION_ITEMS_LENGTH_CHANGE: {
                    if (payload[1]) {
                        applyJump(updateCacheLength(cache, payload[0], true));
                        _scrollMode = SCROLL_BY_SHIFT;
                        mutated = UPDATE_VIRTUAL_STATE;
                    }
                    else {
                        updateCacheLength(cache, payload[0]);
                        // https://github.com/inokawa/virtua/issues/552
                        // https://github.com/inokawa/virtua/issues/557
                        mutated = UPDATE_VIRTUAL_STATE;
                    }
                    break;
                }
                case ACTION_START_OFFSET_CHANGE: {
                    startSpacerSize = payload;
                    break;
                }
                case ACTION_MANUAL_SCROLL: {
                    _scrollMode = SCROLL_BY_MANUAL_SCROLL;
                    break;
                }
                case ACTION_BEFORE_MANUAL_SMOOTH_SCROLL: {
                    _frozenRange = getRange(payload);
                    mutated = UPDATE_VIRTUAL_STATE;
                    break;
                }
            }
            if (mutated) {
                stateVersion = (stateVersion & MAX_INT_32) + 1;
                if (shouldFlushPendingJump && pendingJump) {
                    jump += pendingJump;
                    pendingJump = 0;
                }
                subscribers.forEach(([target, cb]) => {
                    // Early return to skip React's computation
                    if (!(mutated & target)) {
                        return;
                    }
                    // https://github.com/facebook/react/issues/25191
                    // https://github.com/facebook/react/blob/a5fc797db14c6e05d4d5c4dbb22a0dd70d41f5d5/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1443-L1447
                    cb(shouldSync);
                });
            }
        },
    };
};

const timeout = setTimeout;
const debounce = (fn, ms) => {
    let id;
    const cancel = () => {
        if (id != NULL) {
            clearTimeout(id);
        }
    };
    const debouncedFn = () => {
        cancel();
        id = timeout(() => {
            id = NULL;
            fn();
        }, ms);
    };
    debouncedFn._cancel = cancel;
    return debouncedFn;
};
/**
 * scrollLeft is negative value in rtl direction.
 *
 * left  right
 * 0     100    spec compliant (ltr)
 * -100  0      spec compliant (rtl)
 * https://github.com/othree/jquery.rtl-scroll-type
 */
const normalizeOffset = (offset, isHorizontal) => {
    if (isHorizontal && isRTLDocument()) {
        return -offset;
    }
    else {
        return offset;
    }
};
const createScrollObserver = (store, viewport, isHorizontal, getScrollOffset, updateScrollOffset, getStartOffset) => {
    const now = Date.now;
    let lastScrollTime = 0;
    let wheeling = false;
    let touching = false;
    let justTouchEnded = false;
    let stillMomentumScrolling = false;
    const onScrollEnd = debounce(() => {
        if (wheeling || touching) {
            wheeling = false;
            // Wait while wheeling or touching
            onScrollEnd();
            return;
        }
        justTouchEnded = false;
        store.$update(ACTION_SCROLL_END);
    }, 150);
    const onScroll = () => {
        lastScrollTime = now();
        if (justTouchEnded) {
            stillMomentumScrolling = true;
        }
        if (getStartOffset) {
            store.$update(ACTION_START_OFFSET_CHANGE, getStartOffset());
        }
        store.$update(ACTION_SCROLL, getScrollOffset());
        onScrollEnd();
    };
    // Infer scroll state also from wheel events
    // Sometimes scroll events do not fire when frame dropped even if the visual have been already scrolled
    const onWheel = ((e) => {
        if (wheeling ||
            // Scroll start should be detected with scroll event
            !store.$isScrolling() ||
            // Probably a pinch-to-zoom gesture
            e.ctrlKey) {
            return;
        }
        const timeDelta = now() - lastScrollTime;
        if (
        // Check if wheel event occurs some time after scrolling
        150 > timeDelta &&
            50 < timeDelta &&
            // Get delta before checking deltaMode for firefox behavior
            // https://github.com/w3c/uievents/issues/181#issuecomment-392648065
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1392460#c34
            (isHorizontal ? e.deltaX : e.deltaY)) {
            wheeling = true;
        }
    }); // FIXME type error. why only here?
    const onTouchStart = () => {
        touching = true;
        justTouchEnded = stillMomentumScrolling = false;
    };
    const onTouchEnd = () => {
        touching = false;
        if (isIOSWebKit()) {
            justTouchEnded = true;
        }
    };
    viewport.addEventListener("scroll", onScroll);
    viewport.addEventListener("wheel", onWheel, { passive: true });
    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    return {
        _dispose: () => {
            viewport.removeEventListener("scroll", onScroll);
            viewport.removeEventListener("wheel", onWheel);
            viewport.removeEventListener("touchstart", onTouchStart);
            viewport.removeEventListener("touchend", onTouchEnd);
            onScrollEnd._cancel();
        },
        _fixScrollJump: () => {
            const [jump, shift] = store._flushJump();
            if (!jump)
                return;
            updateScrollOffset(normalizeOffset(jump, isHorizontal), shift, stillMomentumScrolling);
            stillMomentumScrolling = false;
            if (shift && store.$getViewportSize() > store.$getTotalSize()) {
                // In this case applying jump may not cause scroll.
                // Current logic expects scroll event occurs after applying jump so we dispatch it manually.
                store.$update(ACTION_SCROLL, getScrollOffset());
            }
        },
    };
};
/**
 * @internal
 */
const createScroller = (store, isHorizontal) => {
    let viewportElement;
    let scrollObserver;
    let cancelScroll;
    const scrollOffsetKey = isHorizontal ? "scrollLeft" : "scrollTop";
    const overflowKey = isHorizontal ? "overflowX" : "overflowY";
    // The given offset will be clamped by browser
    // https://drafts.csswg.org/cssom-view/#dom-element-scrolltop
    const scheduleImperativeScroll = async (getTargetOffset, smooth) => {
        if (!viewportElement) {
            // Wait for element assign. The element may be undefined if scrollRef prop is used and scroll is scheduled on mount.
            microtask(() => scheduleImperativeScroll(getTargetOffset, smooth));
            return;
        }
        if (cancelScroll) {
            // Cancel waiting scrollTo
            cancelScroll();
        }
        const waitForMeasurement = () => {
            // Wait for the scroll destination items to be measured.
            // The measurement will be done asynchronously and the timing is not predictable so we use promise.
            let queue;
            return [
                new Promise((resolve, reject) => {
                    queue = resolve;
                    cancelScroll = reject;
                    // Resize event may not happen when the window/tab is not visible, or during browser back in Safari.
                    // We have to wait for the initial measurement to avoid failing imperative scroll on mount.
                    // https://github.com/inokawa/virtua/issues/450
                    if (isInitialMeasurementDone(store)) {
                        // Reject when items around scroll destination completely measured
                        timeout(reject, 150);
                    }
                }),
                store.$subscribe(UPDATE_SIZE_EVENT, () => {
                    queue && queue();
                }),
            ];
        };
        if (smooth && isSmoothScrollSupported()) {
            while (true) {
                store.$update(ACTION_BEFORE_MANUAL_SMOOTH_SCROLL, getTargetOffset());
                if (!store._hasUnmeasuredItemsInFrozenRange()) {
                    break;
                }
                const [promise, unsubscribe] = waitForMeasurement();
                try {
                    await promise;
                }
                catch (e) {
                    // canceled
                    return;
                }
                finally {
                    unsubscribe();
                }
            }
            viewportElement.scrollTo({
                [isHorizontal ? "left" : "top"]: normalizeOffset(getTargetOffset(), isHorizontal),
                behavior: "smooth",
            });
        }
        else {
            while (true) {
                const [promise, unsubscribe] = waitForMeasurement();
                try {
                    viewportElement[scrollOffsetKey] = normalizeOffset(getTargetOffset(), isHorizontal);
                    store.$update(ACTION_MANUAL_SCROLL);
                    await promise;
                }
                catch (e) {
                    // canceled or finished
                    return;
                }
                finally {
                    unsubscribe();
                }
            }
        }
    };
    return {
        $observe(viewport) {
            viewportElement = viewport;
            scrollObserver = createScrollObserver(store, viewport, isHorizontal, () => normalizeOffset(viewport[scrollOffsetKey], isHorizontal), (jump, shift, isMomentumScrolling) => {
                // If we update scroll position while touching on iOS, the position will be reverted.
                // However iOS WebKit fires touch events only once at the beginning of momentum scrolling.
                // That means we have no reliable way to confirm still touched or not if user touches more than once during momentum scrolling...
                // This is a hack for the suspectable situations, inspired by https://github.com/prud/ios-overflow-scroll-to-top
                if (isMomentumScrolling) {
                    const style = viewport.style;
                    const prev = style[overflowKey];
                    style[overflowKey] = "hidden";
                    timeout(() => {
                        style[overflowKey] = prev;
                    });
                }
                if (shift) {
                    viewport[scrollOffsetKey] = store.$getScrollOffset() + jump;
                    // https://github.com/inokawa/virtua/issues/357
                    cancelScroll && cancelScroll();
                }
                else {
                    viewport[scrollOffsetKey] += jump;
                }
            });
        },
        $dispose() {
            scrollObserver && scrollObserver._dispose();
        },
        $scrollTo(offset) {
            scheduleImperativeScroll(() => offset);
        },
        $scrollBy(offset) {
            offset += store.$getScrollOffset();
            scheduleImperativeScroll(() => offset);
        },
        $scrollToIndex(index, { align, smooth, offset = 0 } = {}) {
            index = clamp(index, 0, store.$getItemsLength() - 1);
            if (align === "nearest") {
                const itemOffset = store.$getItemOffset(index);
                const scrollOffset = store.$getScrollOffset();
                if (itemOffset < scrollOffset) {
                    align = "start";
                }
                else if (itemOffset + store.$getItemSize(index) >
                    scrollOffset + store.$getViewportSize()) {
                    align = "end";
                }
                else {
                    // already completely visible
                    return;
                }
            }
            scheduleImperativeScroll(() => {
                return (offset +
                    store.$getStartSpacerSize() +
                    store.$getItemOffset(index) +
                    (align === "end"
                        ? store.$getItemSize(index) - store.$getViewportSize()
                        : align === "center"
                            ? (store.$getItemSize(index) - store.$getViewportSize()) / 2
                            : 0));
            }, smooth);
        },
        $fixScrollJump: () => {
            scrollObserver && scrollObserver._fixScrollJump();
        },
    };
};
/**
 * @internal
 */
const createWindowScroller = (store, isHorizontal) => {
    let containerElement;
    let scrollObserver;
    let cancelScroll;
    const calcOffsetToViewport = (node, viewport, window, isHorizontal, offset = 0) => {
        // TODO calc offset only when it changes (maybe impossible)
        const offsetKey = isHorizontal ? "offsetLeft" : "offsetTop";
        const offsetSum = offset +
            (isHorizontal && isRTLDocument()
                ? window.innerWidth - node[offsetKey] - node.offsetWidth
                : node[offsetKey]);
        const parent = node.offsetParent;
        if (node === viewport || !parent) {
            return offsetSum;
        }
        return calcOffsetToViewport(parent, viewport, window, isHorizontal, offsetSum);
    };
    const scheduleImperativeScroll = async (getTargetOffset, smooth) => {
        if (!containerElement) {
            // Wait for element assign
            microtask(() => scheduleImperativeScroll(getTargetOffset, smooth));
            return;
        }
        if (cancelScroll) {
            cancelScroll();
        }
        const waitForMeasurement = () => {
            let queue;
            return [
                new Promise((resolve, reject) => {
                    queue = resolve;
                    cancelScroll = reject;
                    if (isInitialMeasurementDone(store)) {
                        timeout(reject, 150);
                    }
                }),
                store.$subscribe(UPDATE_SIZE_EVENT, () => {
                    queue && queue();
                }),
            ];
        };
        const window = getCurrentWindow(getCurrentDocument(containerElement));
        if (smooth && isSmoothScrollSupported()) {
            while (true) {
                store.$update(ACTION_BEFORE_MANUAL_SMOOTH_SCROLL, getTargetOffset());
                if (!store._hasUnmeasuredItemsInFrozenRange()) {
                    break;
                }
                const [promise, unsubscribe] = waitForMeasurement();
                try {
                    await promise;
                }
                catch (e) {
                    return;
                }
                finally {
                    unsubscribe();
                }
            }
            window.scroll({
                [isHorizontal ? "left" : "top"]: normalizeOffset(getTargetOffset(), isHorizontal),
                behavior: "smooth",
            });
        }
        else {
            while (true) {
                const [promise, unsubscribe] = waitForMeasurement();
                try {
                    window.scroll({
                        [isHorizontal ? "left" : "top"]: normalizeOffset(getTargetOffset(), isHorizontal),
                    });
                    store.$update(ACTION_MANUAL_SCROLL);
                    await promise;
                }
                catch (e) {
                    return;
                }
                finally {
                    unsubscribe();
                }
            }
        }
    };
    return {
        $observe(container) {
            containerElement = container;
            const scrollOffsetKey = isHorizontal ? "scrollX" : "scrollY";
            const document = getCurrentDocument(container);
            const window = getCurrentWindow(document);
            const documentBody = document.body;
            scrollObserver = createScrollObserver(store, window, isHorizontal, () => normalizeOffset(window[scrollOffsetKey], isHorizontal), (jump, shift) => {
                // TODO support case two window scrollers exist in the same view
                if (shift) {
                    window.scroll({
                        [isHorizontal ? "left" : "top"]: store.$getScrollOffset() + jump,
                    });
                }
                else {
                    window.scrollBy(isHorizontal ? jump : 0, isHorizontal ? 0 : jump);
                }
            }, () => calcOffsetToViewport(container, documentBody, window, isHorizontal));
        },
        $dispose() {
            scrollObserver && scrollObserver._dispose();
            containerElement = undefined;
        },
        $fixScrollJump: () => {
            scrollObserver && scrollObserver._fixScrollJump();
        },
        $scrollToIndex(index, { align, smooth, offset = 0 } = {}) {
            if (!containerElement)
                return;
            index = clamp(index, 0, store.$getItemsLength() - 1);
            if (align === "nearest") {
                const itemOffset = store.$getItemOffset(index);
                const scrollOffset = store.$getScrollOffset();
                if (itemOffset < scrollOffset) {
                    align = "start";
                }
                else if (itemOffset + store.$getItemSize(index) >
                    scrollOffset + store.$getViewportSize()) {
                    align = "end";
                }
                else {
                    return;
                }
            }
            const document = getCurrentDocument(containerElement);
            const window = getCurrentWindow(document);
            const html = document.documentElement;
            const getScrollbarSize = () => store.$getViewportSize() -
                (isHorizontal ? html.clientWidth : html.clientHeight);
            scheduleImperativeScroll(() => {
                return (offset +
                    // Calculate target scroll position including container's offset from document
                    calcOffsetToViewport(containerElement, document.body, window, isHorizontal) +
                    // store._getStartSpacerSize() +
                    store.$getItemOffset(index) +
                    (align === "end"
                        ? store.$getItemSize(index) -
                            (store.$getViewportSize() - getScrollbarSize())
                        : align === "center"
                            ? (store.$getItemSize(index) -
                                (store.$getViewportSize() - getScrollbarSize())) /
                                2
                            : 0));
            }, smooth);
        },
    };
};
/**
 * @internal
 */
const createGridScroller = (vStore, hStore) => {
    const vScroller = createScroller(vStore, false);
    const hScroller = createScroller(hStore, true);
    return {
        $observe(viewportElement) {
            vScroller.$observe(viewportElement);
            hScroller.$observe(viewportElement);
        },
        $dispose() {
            vScroller.$dispose();
            hScroller.$dispose();
        },
        $scrollTo(offsetX, offsetY) {
            vScroller.$scrollTo(offsetY);
            hScroller.$scrollTo(offsetX);
        },
        $scrollBy(offsetX, offsetY) {
            vScroller.$scrollBy(offsetY);
            hScroller.$scrollBy(offsetX);
        },
        $scrollToIndex(indexX, indexY) {
            vScroller.$scrollToIndex(indexY);
            hScroller.$scrollToIndex(indexX);
        },
        $fixScrollJump() {
            vScroller.$fixScrollJump();
            hScroller.$fixScrollJump();
        },
    };
};

const createResizeObserver = (cb) => {
    let ro;
    return {
        _observe(e) {
            // Initialize ResizeObserver lazily for SSR
            // https://www.w3.org/TR/resize-observer/#intro
            (ro ||
                // https://bugs.chromium.org/p/chromium/issues/detail?id=1491739
                (ro = new (getCurrentWindow(getCurrentDocument(e)).ResizeObserver)(cb))).observe(e);
        },
        _unobserve(e) {
            ro.unobserve(e);
        },
        _dispose() {
            ro && ro.disconnect();
        },
    };
};
/**
 * @internal
 */
const createResizer = (store, isHorizontal) => {
    let viewportElement;
    const sizeKey = isHorizontal ? "width" : "height";
    const mountedIndexes = new WeakMap();
    const resizeObserver = createResizeObserver((entries) => {
        const resizes = [];
        for (const { target, contentRect } of entries) {
            // Skip zero-sized rects that may be observed under `display: none` style
            if (!target.offsetParent)
                continue;
            if (target === viewportElement) {
                store.$update(ACTION_VIEWPORT_RESIZE, contentRect[sizeKey]);
            }
            else {
                const index = mountedIndexes.get(target);
                if (index != NULL) {
                    resizes.push([index, contentRect[sizeKey]]);
                }
            }
        }
        if (resizes.length) {
            store.$update(ACTION_ITEM_RESIZE, resizes);
        }
    });
    return {
        $observeRoot(viewport) {
            resizeObserver._observe((viewportElement = viewport));
        },
        $observeItem: (el, i) => {
            mountedIndexes.set(el, i);
            resizeObserver._observe(el);
            return () => {
                mountedIndexes.delete(el);
                resizeObserver._unobserve(el);
            };
        },
        $dispose: resizeObserver._dispose,
    };
};
/**
 * @internal
 */
const createWindowResizer = (store, isHorizontal) => {
    const sizeKey = isHorizontal ? "width" : "height";
    const windowSizeKey = isHorizontal ? "innerWidth" : "innerHeight";
    const mountedIndexes = new WeakMap();
    const resizeObserver = createResizeObserver((entries) => {
        const resizes = [];
        for (const { target, contentRect } of entries) {
            // Skip zero-sized rects that may be observed under `display: none` style
            if (!target.offsetParent)
                continue;
            const index = mountedIndexes.get(target);
            if (index != NULL) {
                resizes.push([index, contentRect[sizeKey]]);
            }
        }
        if (resizes.length) {
            store.$update(ACTION_ITEM_RESIZE, resizes);
        }
    });
    let cleanupOnWindowResize;
    return {
        $observeRoot(container) {
            const window = getCurrentWindow(getCurrentDocument(container));
            const onWindowResize = () => {
                store.$update(ACTION_VIEWPORT_RESIZE, window[windowSizeKey]);
            };
            window.addEventListener("resize", onWindowResize);
            onWindowResize();
            cleanupOnWindowResize = () => {
                window.removeEventListener("resize", onWindowResize);
            };
        },
        $observeItem: (el, i) => {
            mountedIndexes.set(el, i);
            resizeObserver._observe(el);
            return () => {
                mountedIndexes.delete(el);
                resizeObserver._unobserve(el);
            };
        },
        $dispose() {
            cleanupOnWindowResize && cleanupOnWindowResize();
            resizeObserver._dispose();
        },
    };
};
/**
 * @internal
 */
const createGridResizer = (vStore, hStore) => {
    let viewportElement;
    const heightKey = "height";
    const widthKey = "width";
    const mountedIndexes = new WeakMap();
    const maybeCachedRowIndexes = new Set();
    const maybeCachedColIndexes = new Set();
    const sizeCache = new Map();
    const getKey = (rowIndex, colIndex) => `${rowIndex}-${colIndex}`;
    const resizeObserver = createResizeObserver((entries) => {
        const resizedRows = new Set();
        const resizedCols = new Set();
        for (const { target, contentRect } of entries) {
            // Skip zero-sized rects that may be observed under `display: none` style
            if (!target.offsetParent)
                continue;
            if (target === viewportElement) {
                vStore.$update(ACTION_VIEWPORT_RESIZE, contentRect[heightKey]);
                hStore.$update(ACTION_VIEWPORT_RESIZE, contentRect[widthKey]);
            }
            else {
                const cell = mountedIndexes.get(target);
                if (cell) {
                    const [rowIndex, colIndex] = cell;
                    const key = getKey(rowIndex, colIndex);
                    const prevSize = sizeCache.get(key);
                    const size = [
                        contentRect[heightKey],
                        contentRect[widthKey],
                    ];
                    let rowResized;
                    let colResized;
                    if (!prevSize) {
                        rowResized = colResized = true;
                    }
                    else {
                        if (prevSize[0] !== size[0]) {
                            rowResized = true;
                        }
                        if (prevSize[1] !== size[1]) {
                            colResized = true;
                        }
                    }
                    if (rowResized) {
                        resizedRows.add(rowIndex);
                    }
                    if (colResized) {
                        resizedCols.add(colIndex);
                    }
                    if (rowResized || colResized) {
                        sizeCache.set(key, size);
                    }
                }
            }
        }
        if (resizedRows.size) {
            const heightResizes = [];
            resizedRows.forEach((rowIndex) => {
                let maxHeight = 0;
                maybeCachedColIndexes.forEach((colIndex) => {
                    const size = sizeCache.get(getKey(rowIndex, colIndex));
                    if (size) {
                        maxHeight = max(maxHeight, size[0]);
                    }
                });
                if (maxHeight) {
                    heightResizes.push([rowIndex, maxHeight]);
                }
            });
            vStore.$update(ACTION_ITEM_RESIZE, heightResizes);
        }
        if (resizedCols.size) {
            const widthResizes = [];
            resizedCols.forEach((colIndex) => {
                let maxWidth = 0;
                maybeCachedRowIndexes.forEach((rowIndex) => {
                    const size = sizeCache.get(getKey(rowIndex, colIndex));
                    if (size) {
                        maxWidth = max(maxWidth, size[1]);
                    }
                });
                if (maxWidth) {
                    widthResizes.push([colIndex, maxWidth]);
                }
            });
            hStore.$update(ACTION_ITEM_RESIZE, widthResizes);
        }
    });
    return {
        $observeRoot(viewport) {
            resizeObserver._observe((viewportElement = viewport));
        },
        $observeItem(el, rowIndex, colIndex) {
            mountedIndexes.set(el, [rowIndex, colIndex]);
            maybeCachedRowIndexes.add(rowIndex);
            maybeCachedColIndexes.add(colIndex);
            resizeObserver._observe(el);
            return () => {
                mountedIndexes.delete(el);
                resizeObserver._unobserve(el);
            };
        },
        $dispose: resizeObserver._dispose,
    };
};

/**
 * @jsxImportSource solid-js
 */
/**
 * @internal
 */
const ListItem = (props) => {
    let elementRef;
    props = mergeProps({ _as: "div" }, props);
    // The index may be changed if elements are inserted to or removed from the start of props.children
    createEffect(() => {
        if (!elementRef)
            return;
        onCleanup(props._resizer(elementRef, props._index));
    });
    const style = createMemo(() => {
        const isHorizontal = props._isHorizontal;
        const style = {
            position: "absolute",
            [isHorizontal ? "height" : "width"]: "100%",
            [isHorizontal ? "top" : "left"]: "0px",
            [isHorizontal ? (isRTLDocument() ? "right" : "left") : "top"]: props._offset + "px",
            visibility: props._hide ? "hidden" : "visible",
        };
        if (isHorizontal) {
            style.display = "flex";
        }
        return style;
    });
    return (<Dynamic component={props._as} index={props._index} ref={elementRef} style={style()}>
      {props._children}
    </Dynamic>);
};

/**
 * @internal
 */
const isSameRange = (prev, next) => {
    return prev[0] === next[0] && prev[1] === next[1];
};

/**
 * @jsxImportSource solid-js
 */
/**
 * Customizable list virtualizer for advanced usage. See {@link VirtualizerProps} and {@link VirtualizerHandle}.
 */
const Virtualizer = (props) => {
    let containerRef;
    const { itemSize, horizontal = false, overscan, cache } = props;
    props = mergeProps({ as: "div" }, props);
    const store = createVirtualStore(props.data.length, itemSize, overscan, undefined, cache, !itemSize);
    const resizer = createResizer(store, horizontal);
    const scroller = createScroller(store, horizontal);
    const [stateVersion, setRerender] = createSignal(store.$getStateVersion());
    const unsubscribeStore = store.$subscribe(UPDATE_VIRTUAL_STATE, () => {
        setRerender(store.$getStateVersion());
    });
    const unsubscribeOnScroll = store.$subscribe(UPDATE_SCROLL_EVENT, () => {
        var _a;
        (_a = props.onScroll) === null || _a === void 0 ? void 0 : _a.call(props, store.$getScrollOffset());
    });
    const unsubscribeOnScrollEnd = store.$subscribe(UPDATE_SCROLL_END_EVENT, () => {
        var _a;
        (_a = props.onScrollEnd) === null || _a === void 0 ? void 0 : _a.call(props);
    });
    const range = createMemo((prev) => {
        stateVersion();
        const next = store.$getRange();
        if (prev && isSameRange(prev, next)) {
            return prev;
        }
        return next;
    });
    const isScrolling = createMemo(() => stateVersion() && store.$isScrolling());
    const totalSize = createMemo(() => stateVersion() && store.$getTotalSize());
    onMount(() => {
        if (props.ref) {
            props.ref({
                get cache() {
                    return store.$getCacheSnapshot();
                },
                get scrollOffset() {
                    return store.$getScrollOffset();
                },
                get scrollSize() {
                    return getScrollSize(store);
                },
                get viewportSize() {
                    return store.$getViewportSize();
                },
                findStartIndex: store.$findStartIndex,
                findEndIndex: store.$findEndIndex,
                getItemOffset: store.$getItemOffset,
                getItemSize: store.$getItemSize,
                scrollToIndex: scroller.$scrollToIndex,
                scrollTo: scroller.$scrollTo,
                scrollBy: scroller.$scrollBy,
            });
        }
        const scrollable = props.scrollRef || containerRef.parentElement;
        resizer.$observeRoot(scrollable);
        scroller.$observe(scrollable);
        onCleanup(() => {
            if (props.ref) {
                props.ref();
            }
            unsubscribeStore();
            unsubscribeOnScroll();
            unsubscribeOnScrollEnd();
            resizer.$dispose();
            scroller.$dispose();
        });
    });
    createComputed(on(() => props.startMargin || 0, (value) => {
        if (value !== store.$getStartSpacerSize()) {
            store.$update(ACTION_START_OFFSET_CHANGE, value);
        }
    }));
    createEffect(on(stateVersion, () => {
        scroller.$fixScrollJump();
    }));
    const dataSlice = createMemo(() => {
        const count = props.data.length;
        untrack(() => {
            if (count !== store.$getItemsLength()) {
                store.$update(ACTION_ITEMS_LENGTH_CHANGE, [count, props.shift]);
            }
        });
        const [start, end] = range();
        const items = end >= 0 ? props.data.slice(start, end + 1) : [];
        const indexes = items.map((_, index) => start + index);
        if (props.keepMounted) {
            const startItems = [];
            const startIndexes = [];
            const endItems = [];
            const endIndexes = [];
            sort(props.keepMounted).forEach((index) => {
                if (index < 0 || index >= props.data.length)
                    return;
                if (index < start) {
                    startItems.push(props.data[index]);
                    startIndexes.push(index);
                }
                if (index > end) {
                    endItems.push(props.data[index]);
                    endIndexes.push(index);
                }
            });
            items.unshift(...startItems);
            indexes.unshift(...startIndexes);
            items.push(...endItems);
            indexes.push(...endIndexes);
        }
        return { _items: items, _indexes: indexes };
    });
    const renderItem = (data, index) => {
        const offset = createMemo(() => {
            stateVersion();
            return store.$getItemOffset(index());
        });
        const hide = createMemo(() => {
            stateVersion();
            return store.$isUnmeasuredItem(index());
        });
        const children = createMemo(() => {
            return untrack(() => props.children(data, index));
        });
        return (<ListItem _as={props.item} _index={index()} _resizer={resizer.$observeItem} _offset={offset()} _hide={hide()} _children={children()} _isHorizontal={horizontal}/>);
    };
    return (<Dynamic component={props.as} ref={containerRef} style={{
            // contain: "content",
            "overflow-anchor": "none", // opt out browser's scroll anchoring because it will conflict to scroll anchoring of virtualizer
            flex: "none", // flex style can break layout
            position: "relative",
            visibility: "hidden", // TODO replace with other optimization methods
            width: horizontal ? totalSize() + "px" : "100%",
            height: horizontal ? "100%" : totalSize() + "px",
            "pointer-events": isScrolling() ? "none" : undefined,
        }}>
      <For each={dataSlice()._items}>
        {(data, index) => {
            const itemIndex = createMemo(() => dataSlice()._indexes[index()]);
            // eslint-disable-next-line solid/reactivity
            return renderItem(data, itemIndex);
        }}
      </For>
    </Dynamic>);
};

/**
 * @jsxImportSource solid-js
 */
/**
 * Virtualized list component. See {@link VListProps} and {@link VListHandle}.
 */
const VList = (props) => {
    const [local, others] = splitProps(props, [
        "ref",
        "data",
        "children",
        "overscan",
        "itemSize",
        "shift",
        "horizontal",
        "keepMounted",
        "cache",
        "item",
        "onScroll",
        "onScrollEnd",
        "style",
    ]);
    return (<div {...others} style={{
            display: local.horizontal ? "inline-block" : "block",
            [local.horizontal ? "overflow-x" : "overflow-y"]: "auto",
            contain: "strict",
            width: "100%",
            height: "100%",
            ...local.style,
        }}>
      <Virtualizer ref={local.ref} data={local.data} overscan={local.overscan} itemSize={local.itemSize} shift={local.shift} horizontal={local.horizontal} keepMounted={local.keepMounted} cache={local.cache} item={local.item} onScroll={local.onScroll} onScrollEnd={local.onScrollEnd}>
        {local.children}
      </Virtualizer>
    </div>);
};

/**
 * @jsxImportSource solid-js
 */
/**
 * {@link Virtualizer} controlled by the window scrolling. See {@link WindowVirtualizerProps} and {@link WindowVirtualizerHandle}.
 */
const WindowVirtualizer = (props) => {
    let containerRef;
    const { ref: _ref, data: _data, children: _children, overscan, itemSize, shift: _shift, horizontal = false, cache, onScrollEnd: _onScrollEnd, } = props;
    const store = createVirtualStore(props.data.length, itemSize, overscan, undefined, cache, !itemSize);
    const resizer = createWindowResizer(store, horizontal);
    const scroller = createWindowScroller(store, horizontal);
    const [stateVersion, setRerender] = createSignal(store.$getStateVersion());
    const unsubscribeStore = store.$subscribe(UPDATE_VIRTUAL_STATE, () => {
        setRerender(store.$getStateVersion());
    });
    const unsubscribeOnScroll = store.$subscribe(UPDATE_SCROLL_EVENT, () => {
        var _a;
        // https://github.com/inokawa/virtua/discussions/580
        (_a = props.onScroll) === null || _a === void 0 ? void 0 : _a.call(props);
    });
    const unsubscribeOnScrollEnd = store.$subscribe(UPDATE_SCROLL_END_EVENT, () => {
        var _a;
        (_a = props.onScrollEnd) === null || _a === void 0 ? void 0 : _a.call(props);
    });
    const range = createMemo((prev) => {
        stateVersion();
        const next = store.$getRange();
        if (prev && isSameRange(prev, next)) {
            return prev;
        }
        return next;
    });
    const isScrolling = createMemo(() => stateVersion() && store.$isScrolling());
    const totalSize = createMemo(() => stateVersion() && store.$getTotalSize());
    onMount(() => {
        if (props.ref) {
            props.ref({
                get cache() {
                    return store.$getCacheSnapshot();
                },
                findStartIndex: store.$findStartIndex,
                findEndIndex: store.$findEndIndex,
                scrollToIndex: scroller.$scrollToIndex,
            });
        }
        resizer.$observeRoot(containerRef);
        scroller.$observe(containerRef);
        onCleanup(() => {
            if (props.ref) {
                props.ref();
            }
            unsubscribeStore();
            unsubscribeOnScroll();
            unsubscribeOnScrollEnd();
            resizer.$dispose();
            scroller.$dispose();
        });
    });
    createEffect(on(stateVersion, () => {
        scroller.$fixScrollJump();
    }));
    const dataSlice = createMemo(() => {
        const count = props.data.length;
        untrack(() => {
            if (count !== store.$getItemsLength()) {
                store.$update(ACTION_ITEMS_LENGTH_CHANGE, [count, props.shift]);
            }
        });
        const [start, end] = range();
        return end >= 0 ? props.data.slice(start, end + 1) : [];
    });
    return (<div ref={containerRef} style={{
            // contain: "content",
            "overflow-anchor": "none", // opt out browser's scroll anchoring because it will conflict to scroll anchoring of virtualizer
            flex: "none", // flex style can break layout
            position: "relative",
            visibility: "hidden", // TODO replace with other optimization methods
            width: horizontal ? totalSize() + "px" : "100%",
            height: horizontal ? "100%" : totalSize() + "px",
            "pointer-events": isScrolling() ? "none" : undefined,
        }}>
      <For each={dataSlice()}>
        {(data, index) => {
            const itemIndex = createMemo(() => range()[0] + index());
            const offset = createMemo(() => {
                stateVersion();
                return store.$getItemOffset(itemIndex());
            });
            const hide = createMemo(() => {
                stateVersion();
                return store.$isUnmeasuredItem(itemIndex());
            });
            const children = createMemo(() => {
                return untrack(() => props.children(data, itemIndex));
            });
            return (<ListItem _index={itemIndex()} _resizer={resizer.$observeItem} _offset={offset()} _hide={hide()} _children={children()} _isHorizontal={horizontal}/>);
        }}
      </For>
    </div>);
};

/**
 * @module solid
 */

export { VList, Virtualizer, WindowVirtualizer };
//# sourceMappingURL=index.jsx.map
