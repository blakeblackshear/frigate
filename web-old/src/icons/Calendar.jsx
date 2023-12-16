import { h } from 'preact';
import { memo } from 'preact/compat';

export function Calendar({ className = 'h-6 w-6', stroke = 'currentColor', fill = 'none', onClick = () => {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill={fill}
      viewBox="0 0 24 24"
      stroke={stroke}
      onClick={onClick}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

export default memo(Calendar);
