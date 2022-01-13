import { h } from 'preact';
import { memo } from 'preact/compat';

export function ArrowDropdown({ className = '' }) {
  return (
    <svg className={`fill-current ${className}`} viewBox="0 0 24 24">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6m4 18H6V4h7v5h5v11m-8.5-2l.7-2.8L8 13.3l2.9-.2 1.1-2.7 1.1 2.6 2.9.2-2.2 1.9.7 2.8-2.5-1.4L9.5 18z" />
    </svg>
  );
}

export default memo(StarRecording);
