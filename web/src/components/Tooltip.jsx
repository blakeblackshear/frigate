import { h } from 'preact';
import { createPortal } from 'preact/compat';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

const TIP_SPACE = 20;

export default function Tooltip({ relativeTo, text, capitalize }) {
  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const portalRoot = document.getElementById('tooltips');
  const ref = useRef();

  useLayoutEffect(() => {
    if (ref && ref.current && relativeTo && relativeTo.current) {
      const windowWidth = window.innerWidth;
      const {
        x: relativeToX,
        y: relativeToY,
        width: relativeToWidth,
        height: relativeToHeight,
      } = relativeTo.current.getBoundingClientRect();
      const { width: _tipWidth, height: _tipHeight } = ref.current.getBoundingClientRect();
      const tipWidth = _tipWidth * 1.1;
      const tipHeight = _tipHeight * 1.1;

      const left = relativeToX + Math.round(relativeToWidth / 2) + window.scrollX;
      const top = relativeToY + Math.round(relativeToHeight / 2) + window.scrollY;

      let newTop = top - TIP_SPACE - tipHeight;
      let newLeft = left - Math.round(tipWidth / 2);
      // too far right
      if (newLeft + tipWidth + TIP_SPACE > windowWidth - window.scrollX) {
        newLeft = Math.max(0, left - tipWidth - TIP_SPACE);
        newTop = top - Math.round(tipHeight / 2);
      }
      // too far left
      else if (newLeft < TIP_SPACE + window.scrollX) {
        newLeft = left + TIP_SPACE;
        newTop = top - Math.round(tipHeight / 2);
      }
      // too close to top
      else if (newTop <= TIP_SPACE + window.scrollY) {
        newTop = top + tipHeight + TIP_SPACE;
      }

      setPosition({ left: newLeft, top: newTop });
    }
  }, [relativeTo, ref]);

  const tooltip = (
    <div
      role="tooltip"
      className={`shadow max-w-lg absolute pointer-events-none bg-gray-900 dark:bg-gray-200 bg-opacity-80 rounded px-2 py-1 transition-transform transition-opacity duration-75 transform scale-90 opacity-0 text-gray-100 dark:text-gray-900 text-sm ${
        capitalize ? 'capitalize' : ''
      } ${position.top >= 0 ? 'opacity-100 scale-100' : ''}`}
      ref={ref}
      style={position}
    >
      {text}
    </div>
  );

  return portalRoot ? createPortal(tooltip, portalRoot) : tooltip;
}
