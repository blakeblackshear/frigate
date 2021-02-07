import { h, Fragment } from 'preact';
import { createPortal } from 'preact/compat';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

const WINDOW_PADDING = 10;

export default function RelativeModal({
  className,
  role = 'dialog',
  children,
  onDismiss,
  portalRootID,
  relativeTo,
  widthRelative = false,
}) {
  const [position, setPosition] = useState({ top: -999, left: -999 });
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
      const focusable = ref.current.querySelectorAll('[tabindex]');
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
        return;
      }
    },
    [ref.current]
  );

  useLayoutEffect(() => {
    if (ref && ref.current && relativeTo && relativeTo.current) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const { width: menuWidth, height: menuHeight } = ref.current.getBoundingClientRect();
      const { x, y, width: relativeWidth, height } = relativeTo.current.getBoundingClientRect();

      const width = widthRelative ? relativeWidth : menuWidth;

      let top = y + height;
      let left = x;
      // too far right
      if (left + width >= windowWidth - WINDOW_PADDING) {
        left = windowWidth - width - WINDOW_PADDING;
      }
      // too far left
      else if (left < WINDOW_PADDING) {
        left = WINDOW_PADDING;
      }
      // too close to bottom
      if (top + menuHeight > windowHeight - WINDOW_PADDING) {
        top = y - menuHeight;
      }

      if (top <= WINDOW_PADDING) {
        top = WINDOW_PADDING;
      }

      const maxHeight = windowHeight - WINDOW_PADDING * 2 > menuHeight ? null : windowHeight - WINDOW_PADDING * 2;
      const newPosition = { left: left + window.scrollX, top: top + window.scrollY, maxHeight };
      if (widthRelative) {
        newPosition.width = relativeWidth;
      }
      setPosition(newPosition);
      const focusable = ref.current.querySelector('[tabindex]');
      focusable && focusable.focus();
    }
  }, [relativeTo && relativeTo.current, ref && ref.current, widthRelative]);

  useEffect(() => {
    if (position.top >= 0) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [show, position.top, ref.current]);

  const menu = (
    <Fragment>
      <div key="scrim" className="absolute inset-0 z-10" onClick={handleDismiss} />
      <div
        key="menu"
        className={`z-10 bg-white dark:bg-gray-700 dark:text-white absolute shadow-lg rounded w-auto h-auto transition-all duration-75 transform scale-90 opacity-0 overflow-scroll ${
          show ? 'scale-100 opacity-100' : ''
        } ${className}`}
        onkeydown={handleKeydown}
        role={role}
        ref={ref}
        style={position.top >= 0 ? position : null}
      >
        {children}
      </div>
    </Fragment>
  );

  return portalRoot ? createPortal(menu, portalRoot) : menu;
}
