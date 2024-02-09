import { h } from 'preact';
import { memo } from 'preact/compat';

export function Previous() {
  return (
    <svg style="width:24px;height:24px" viewBox="0 0 24 24">
      <path fill="currentColor" d="M20,5V19L13,12M6,5V19H4V5M13,5V19L6,12" />
    </svg>
  );
}

export default memo(Previous);
