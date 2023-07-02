import { h } from 'preact';
import { memo } from 'preact/compat';

export function Stop({ className = 'h-6 w-6', stroke = 'currentColor', fill = 'none', onClick = () => {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill={fill}
      viewBox="0 0 10.334 10.334"
      stroke={stroke}
      onClick={onClick}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        style="fill:030104"
        d="M10.333,9.816c0,0.285-0.231,0.518-0.517,0.518H0.517C0.233,10.334,0,10.102,0,9.816V0.517 C0,0.232,0.231,0,0.517,0h9.299c0.285,0,0.517,0.231,0.517,0.517V9.816z"
      />
    </svg>
  );
}

export default memo(Stop);
