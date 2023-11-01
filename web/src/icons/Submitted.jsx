import { h } from 'preact';
import { memo } from 'preact/compat';

export function Submitted({ className = 'h-6 w-6', inner_fill = 'none', outer_stroke = 'currentColor', onClick = () => {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 32 32"
      onClick={onClick}
    >
    <rect x="10" y="15" fill={inner_fill} width="12" height="2"/>
    <rect x="15" y="10" fill={inner_fill} width="2" height="12"/>
    <circle fill="none" stroke={outer_stroke} stroke-width="2" stroke-miterlimit="10" cx="16" cy="16" r="12"/>
  </svg>
  );
}

export default memo(Submitted);
