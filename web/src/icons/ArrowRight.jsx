import { h } from 'preact';
import { memo } from 'preact/compat';

export function ArrowRight({ className = '' }) {
  return (
    <svg className={`fill-current ${className}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M5 3l3.057-3 11.943 12-11.943 12-3.057-3 9-9z" />
    </svg>
  );
}

export default memo(ArrowRight);
