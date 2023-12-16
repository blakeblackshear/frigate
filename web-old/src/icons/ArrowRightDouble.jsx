import { h } from 'preact';
import { memo } from 'preact/compat';

export function ArrowRightDouble({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={`${className}`}
    >
      <path d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export default memo(ArrowRightDouble);
