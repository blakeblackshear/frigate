import { h } from 'preact';
import { memo } from 'preact/compat';

export function Arrow({ rotate_degrees = 0, className = '' }) {
  return (
    <svg className={`fill-current ${className}`} viewBox="0 0 24 24" transform={`rotate(${rotate_degrees})`}>
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M7 14l5-5 5 5z" />
    </svg>
  );
}

export default memo(Arrow);
