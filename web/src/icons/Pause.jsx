import { h } from 'preact';
import { memo } from 'preact/compat';

export function Pause({ className = '' }) {
  return (
    <svg height='24' viewBox='0 0 24 24' width='24' className={className}>
      <path d='M0 0h24v24H0V0z' fill='none' />
      <path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z' className='fill-current' />
    </svg>
  );
}

export default memo(Pause);
