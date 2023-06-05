import { h } from 'preact';
import { memo } from 'preact/compat';

function Exit({ className = '' }) {
  return (
    <svg className={`fill-current ${className}`} viewBox="0 0 24 24">
      <path d="M22 12l-4-4v3h-8v2h8v3m2 2a10 10 0 110-12h-2.73a8 8 0 100 12z" />
    </svg>
  );
}

export default memo(Exit);
