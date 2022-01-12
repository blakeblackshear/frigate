
import { h } from 'preact';
import { memo } from 'preact/compat';

export function Next({ className = '' }) {
  return (
    <svg style="width:24px;height:24px" viewBox="0 0 24 24">
      <path fill="white" d="M4,5V19L11,12M18,5V19H20V5M11,5V19L18,12" />
    </svg>
  );
}

export default memo(Next);
