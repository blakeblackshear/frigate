import { h } from 'preact';
import { memo } from 'preact/compat';

export function ArrowDropup() {
  return (
    <svg className="fill-current" viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M7 14l5-5 5 5z" />
    </svg>
  );
}

export default memo(ArrowDropup);
