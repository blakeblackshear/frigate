import { h, Fragment } from 'preact';
import { createPortal } from 'preact/compat';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

const WINDOW_PADDING = 20;

export default function RelativeModal({
  className,
  role = 'dialog',
  children,
  onDismiss,
  portalRootID,
  relativeTo,
  widthRelative = false,
}) {
  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const [show, setShow] = useState(false);
  const portalRoot = portalRootID && document.getElementById(portalRootID);
  const ref = useRef(null);

  const handleDismiss = useCallback(
    (event) => {
      onDismiss && onDismiss(event);
    },
    [onDismiss]
  );

  const handleKeydown = useCallback(
    (event) => {
      const focusable = ref.current && ref.current.querySelectorAll('[tabindex]');
      if (event.key === 'Tab' && focusable.length) {
        if (event.shiftKey && document.activeElement === focusable[0]) {
          focusable[focusable.length - 1].focus();
          event.preventDefault();
        } else if (document.activeElement === focusable[focusable.length - 1]) {
          focusable[0].focus();
          event.preventDefault();
        }
        return;
      }

      if (event.key === 'Escape') {
        setShow(false);
        handleDismiss();
        return;
      }
    },
    [ref, handleDismiss]
  );

  useLayoutEffect(() => {
    if (ref && ref.current && relativeTo && relativeTo.current) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const { width: menuWidth, height: menuHeight } = ref.current.getBoundingClientRect();
      const {
        x: relativeToX,
        y: relativeToY,
        width: relativeToWidth,
        // height: relativeToHeight,
      } = relativeTo.current.getBoundingClientRect();

      const _width = widthRelative ? relativeToWidth : menuWidth;
      const width = _width * 1.1;

      const left = relativeToX + window.scrollX;
      const top = relativeToY + window.scrollY;

      let newTop = top;
      let newLeft = left;

      // too far left
      if (left < WINDOW_PADDING) {
        newLeft = WINDOW_PADDING;
      }
      // too far right
      else if (newLeft + width + WINDOW_PADDING >= windowWidth - WINDOW_PADDING) {
        newLeft = windowWidth - width - WINDOW_PADDING;
      }

      // too close to bottom
      if (top + menuHeight > windowHeight - WINDOW_PADDING + window.scrollY) {
        // If the pop-up modal would extend beyond the bottom of the visible window,
        // reposition the modal to appear above the clicked icon instead
        newTop = top - menuHeight;
      }

      if (top <= WINDOW_PADDING + window.scrollY) {
        newTop = WINDOW_PADDING;
      }

      const maxHeight = windowHeight - WINDOW_PADDING * 2 > menuHeight ? null : windowHeight - WINDOW_PADDING * 2;
      const newPosition = { left: newLeft, top: newTop, maxHeight };
      if (widthRelative) {
        newPosition.width = relativeToWidth;
      }
      setPosition(newPosition);
      const focusable = ref.current.querySelector('[tabindex]');
      focusable && focusable.focus();
    }
  }, [relativeTo, ref, widthRelative]);

  useEffect(() => {
    if (position.top >= 0) {
      window.requestAnimationFrame(() => {
        setShow(true);
      });
    } else {
      setShow(false);
    }
  }, [show, position, ref]);

  const menu = (
    <Fragment>
      <div data-testid="scrim" key="scrim" className="fixed inset-0 z-10" onClick={handleDismiss} />
      <div
        key="menu"
        className={`z-10 bg-white dark:bg-gray-700 dark:text-white absolute shadow-lg rounded w-auto h-auto transition-transform transition-opacity duration-75 transform scale-90 opacity-0 overflow-x-hidden overflow-y-auto ${
          show ? 'scale-100 opacity-100' : ''
        } ${className}`}
        onKeyDown={handleKeydown}
        role={role}
        ref={ref}
        style={position}
      >
        {children}
      </div>
    </Fragment>
  );

  return portalRoot ? createPortal(menu, portalRoot) : menu;
}
