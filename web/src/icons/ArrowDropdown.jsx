import { h } from 'preact';
import { memo } from 'preact/compat';

export function ArrowDropdown({ className = '' }) {
  return (
    <svg className={`fill-current ${className}`} viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

export default memo(ArrowDropdown);
