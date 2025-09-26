import { useLayoutEffect, useRef } from "react";
import { Animation } from "./UI.js";
const asHtmlElement = (element) => {
    if (element instanceof HTMLElement)
        return element;
    return null;
};
const queryMonthEls = (element) => [
    ...(element.querySelectorAll("[data-animated-month]") ?? []),
];
const queryMonthEl = (element) => asHtmlElement(element.querySelector("[data-animated-month]"));
const queryCaptionEl = (element) => asHtmlElement(element.querySelector("[data-animated-caption]"));
const queryWeeksEl = (element) => asHtmlElement(element.querySelector("[data-animated-weeks]"));
const queryNavEl = (element) => asHtmlElement(element.querySelector("[data-animated-nav]"));
const queryWeekdaysEl = (element) => asHtmlElement(element.querySelector("[data-animated-weekdays]"));
/**
 * Handles animations for transitioning between months in the DayPicker
 * component.
 *
 * @private
 * @param rootElRef - A reference to the root element of the DayPicker
 *   component.
 * @param enabled - Whether animations are enabled.
 * @param options - Configuration options for the animation, including class
 *   names, months, focused day, and the date utility library.
 */
export function useAnimation(rootElRef, enabled, { classNames, months, focused, dateLib, }) {
    const previousRootElSnapshotRef = useRef(null);
    const previousMonthsRef = useRef(months);
    const animatingRef = useRef(false);
    useLayoutEffect(() => {
        // get previous months before updating the previous months ref
        const previousMonths = previousMonthsRef.current;
        // update previous months ref for next effect trigger
        previousMonthsRef.current = months;
        if (!enabled ||
            !rootElRef.current ||
            // safety check because the ref can be set to anything by consumers
            !(rootElRef.current instanceof HTMLElement) ||
            // validation required for the animation to work as expected
            months.length === 0 ||
            previousMonths.length === 0 ||
            months.length !== previousMonths.length) {
            return;
        }
        const isSameMonth = dateLib.isSameMonth(months[0].date, previousMonths[0].date);
        const isAfterPreviousMonth = dateLib.isAfter(months[0].date, previousMonths[0].date);
        const captionAnimationClass = isAfterPreviousMonth
            ? classNames[Animation.caption_after_enter]
            : classNames[Animation.caption_before_enter];
        const weeksAnimationClass = isAfterPreviousMonth
            ? classNames[Animation.weeks_after_enter]
            : classNames[Animation.weeks_before_enter];
        // get previous root element snapshot before updating the snapshot ref
        const previousRootElSnapshot = previousRootElSnapshotRef.current;
        // update snapshot for next effect trigger
        const rootElSnapshot = rootElRef.current.cloneNode(true);
        if (rootElSnapshot instanceof HTMLElement) {
            // if this effect is triggered while animating, we need to clean up the new root snapshot
            // to put it in the same state as when not animating, to correctly animate the next month change
            const currentMonthElsSnapshot = queryMonthEls(rootElSnapshot);
            currentMonthElsSnapshot.forEach((currentMonthElSnapshot) => {
                if (!(currentMonthElSnapshot instanceof HTMLElement))
                    return;
                // remove the old month snapshots from the new root snapshot
                const previousMonthElSnapshot = queryMonthEl(currentMonthElSnapshot);
                if (previousMonthElSnapshot &&
                    currentMonthElSnapshot.contains(previousMonthElSnapshot)) {
                    currentMonthElSnapshot.removeChild(previousMonthElSnapshot);
                }
                // remove animation classes from the new month snapshots
                const captionEl = queryCaptionEl(currentMonthElSnapshot);
                if (captionEl) {
                    captionEl.classList.remove(captionAnimationClass);
                }
                const weeksEl = queryWeeksEl(currentMonthElSnapshot);
                if (weeksEl) {
                    weeksEl.classList.remove(weeksAnimationClass);
                }
            });
            previousRootElSnapshotRef.current = rootElSnapshot;
        }
        else {
            previousRootElSnapshotRef.current = null;
        }
        if (animatingRef.current ||
            isSameMonth ||
            // skip animation if a day is focused because it can cause issues to the animation and is better for a11y
            focused) {
            return;
        }
        const previousMonthEls = previousRootElSnapshot instanceof HTMLElement
            ? queryMonthEls(previousRootElSnapshot)
            : [];
        const currentMonthEls = queryMonthEls(rootElRef.current);
        if (currentMonthEls?.every((el) => el instanceof HTMLElement) &&
            previousMonthEls &&
            previousMonthEls.every((el) => el instanceof HTMLElement)) {
            animatingRef.current = true;
            const cleanUpFunctions = [];
            // set isolation to isolate to isolate the stacking context during animation
            rootElRef.current.style.isolation = "isolate";
            // set z-index to 1 to ensure the nav is clickable over the other elements being animated
            const navEl = queryNavEl(rootElRef.current);
            if (navEl) {
                navEl.style.zIndex = "1";
            }
            currentMonthEls.forEach((currentMonthEl, index) => {
                const previousMonthEl = previousMonthEls[index];
                if (!previousMonthEl) {
                    return;
                }
                // animate new displayed month
                currentMonthEl.style.position = "relative";
                currentMonthEl.style.overflow = "hidden";
                const captionEl = queryCaptionEl(currentMonthEl);
                if (captionEl) {
                    captionEl.classList.add(captionAnimationClass);
                }
                const weeksEl = queryWeeksEl(currentMonthEl);
                if (weeksEl) {
                    weeksEl.classList.add(weeksAnimationClass);
                }
                // animate new displayed month end
                const cleanUp = () => {
                    animatingRef.current = false;
                    if (rootElRef.current) {
                        rootElRef.current.style.isolation = "";
                    }
                    if (navEl) {
                        navEl.style.zIndex = "";
                    }
                    if (captionEl) {
                        captionEl.classList.remove(captionAnimationClass);
                    }
                    if (weeksEl) {
                        weeksEl.classList.remove(weeksAnimationClass);
                    }
                    currentMonthEl.style.position = "";
                    currentMonthEl.style.overflow = "";
                    if (currentMonthEl.contains(previousMonthEl)) {
                        currentMonthEl.removeChild(previousMonthEl);
                    }
                };
                cleanUpFunctions.push(cleanUp);
                // animate old displayed month
                previousMonthEl.style.pointerEvents = "none";
                previousMonthEl.style.position = "absolute";
                previousMonthEl.style.overflow = "hidden";
                previousMonthEl.setAttribute("aria-hidden", "true");
                // hide the weekdays container of the old month and only the new one
                const previousWeekdaysEl = queryWeekdaysEl(previousMonthEl);
                if (previousWeekdaysEl) {
                    previousWeekdaysEl.style.opacity = "0";
                }
                const previousCaptionEl = queryCaptionEl(previousMonthEl);
                if (previousCaptionEl) {
                    previousCaptionEl.classList.add(isAfterPreviousMonth
                        ? classNames[Animation.caption_before_exit]
                        : classNames[Animation.caption_after_exit]);
                    previousCaptionEl.addEventListener("animationend", cleanUp);
                }
                const previousWeeksEl = queryWeeksEl(previousMonthEl);
                if (previousWeeksEl) {
                    previousWeeksEl.classList.add(isAfterPreviousMonth
                        ? classNames[Animation.weeks_before_exit]
                        : classNames[Animation.weeks_after_exit]);
                }
                currentMonthEl.insertBefore(previousMonthEl, currentMonthEl.firstChild);
            });
        }
    });
}
