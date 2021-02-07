import { h } from 'preact';
import { memo } from 'preact/compat';

export function Menu() {
  return (
    <svg className="fill-current" viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  );
}

export default memo(Menu);
