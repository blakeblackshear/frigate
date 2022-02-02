import { h } from 'preact';
import { memo } from 'preact/compat';

export function ArrowLeft({ className = '' }) {
  return (
    <svg
      className={`fill-current ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1.218 19l-1.782-1.75 5.25-5.25-5.25-5.25 1.782-1.75 6.968 7-6.968 7z" />
    </svg>
  );
}

export default memo(ArrowLeft);
