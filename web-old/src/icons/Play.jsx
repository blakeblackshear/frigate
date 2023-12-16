import { h } from 'preact';
import { memo } from 'preact/compat';

export function Play({ className = '' }) {
  return (
    <svg className={`fill-current ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
    </svg>
  );
}

export default memo(Play);
