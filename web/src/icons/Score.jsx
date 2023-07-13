import { h } from 'preact';
import { memo } from 'preact/compat';

export function Score({ className = 'h-6 w-6', stroke = 'currentColor', fill = 'currentColor', onClick = () => {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill={fill}
      viewBox="0 0 24 24"
      stroke={stroke}
      onClick={onClick}
    >
      <title>percent</title>
      <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M19,19H15V21H19A2,2 0 0,0 21,19V15H19M19,3H15V5H19V9H21V5A2,2 0 0,0 19,3M5,5H9V3H5A2,2 0 0,0 3,5V9H5M5,15H3V19A2,2 0 0,0 5,21H9V19H5V15Z" />
    </svg>
  );
}

export default memo(Score);
