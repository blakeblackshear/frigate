import { h, Fragment } from 'preact';
import { createPortal } from 'preact/compat';
import { DarkModeProvider } from '../context';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

const WINDOW_PADDING = 20;

export default function RelativeModal({ className, role = 'dialog', children, onDismiss, portalRootID, relativeTo }) {
  const [position, setPosition] = useState({ top: -999, left: 0, width: 0 });
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
      const { x, y, width, height } = relativeTo.current.getBoundingClientRect();
      let top = y + height;
      let left = x;
      // too far right
      if (left + menuWidth >= windowWidth - WINDOW_PADDING) {
        left = windowWidth - menuWidth - WINDOW_PADDING;
      }
      // too far left
      else if (left < WINDOW_PADDING) {
        left = WINDOW_PADDING;
      }
      // too close to bottom
      if (top + menuHeight > windowHeight - WINDOW_PADDING) {
        top = y - menuHeight;
      }
      setPosition({ left, top, width });
      const focusable = ref.current.querySelector('[tabindex]');
      focusable && console.log('focusing');
      focusable && focusable.focus();
    }
  }, [relativeTo && relativeTo.current, ref && ref.current]);

  useEffect(() => {
    if (position.width) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [show, position.width, ref.current]);

  const menu = (
    <DarkModeProvider>
      <div className="absolute inset-0" onClick={handleDismiss} />
      <div
        className={`z-10 bg-white dark:bg-gray-700 dark:text-white absolute shadow-lg rounded w-auto max-h-48 transition-all duration-75 transform scale-90 opacity-0 ${
          show ? 'scale-100 opacity-100' : ''
        } ${className}`}
        onkeydown={handleKeydown}
        role={role}
        ref={ref}
        style={
          position.width > 0 ? `min-width: ${position.width}px; top: ${position.top}px; left: ${position.left}px` : ''
        }
      >
        {children}
      </div>
    </DarkModeProvider>
  );

  return portalRoot ? createPortal(menu, portalRoot) : menu;
}
