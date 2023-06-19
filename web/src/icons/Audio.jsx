import { h } from 'preact';
import { memo } from 'preact/compat';

export function Snapshot({ className = 'h-6 w-6', stroke = 'currentColor', onClick = () => {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      stroke={stroke}
      onClick={onClick}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M18 30v-2a10.011 10.011 0 0010-10h2a12.013 12.013 0 01-12 12z"
      />
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M18 22v-2a2.002 2.002 0 002-2h2a4.004 4.004 0 01-4 4zM10 2a9.01 9.01 0 00-9 9h2a7 7 0 0114 0 7.09 7.09 0 01-3.501 6.135l-.499.288v3.073a2.935 2.935 0 01-.9 2.151 4.182 4.182 0 01-4.633 1.03A4.092 4.092 0 015 20H3a6.116 6.116 0 003.67 5.512 5.782 5.782 0 002.314.486 6.585 6.585 0 004.478-1.888A4.94 4.94 0 0015 20.496v-1.942A9.108 9.108 0 0019 11a9.01 9.01 0 00-9-9z"
      />
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9.28 8.082A3.006 3.006 0 0113 11h2a4.979 4.979 0 00-1.884-3.911 5.041 5.041 0 00-4.281-.957 4.95 4.95 0 00-3.703 3.703 5.032 5.032 0 002.304 5.458A3.078 3.078 0 019 17.924V20h2v-2.077a5.06 5.06 0 00-2.537-4.346 3.002 3.002 0 01.817-5.494z"
      />
    </svg>
  );
}

export default memo(Snapshot);
