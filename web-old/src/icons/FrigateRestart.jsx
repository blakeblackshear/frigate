import { h } from 'preact';
import { memo } from 'preact/compat';

export function FrigateRestart({ className = '' }) {
  return (
    <svg className={`fill-current ${className}`} viewBox="0 0 24 24">
      <rect fill="none" height="24" width="24" />
      <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z" />
    </svg>
  );
}

export default memo(FrigateRestart);
