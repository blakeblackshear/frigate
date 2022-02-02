import { h } from 'preact';
import { memo } from 'preact/compat';

export function ArrowRightDouble({ className = '' }) {
  return (
    <svg className={`fill-current ${className}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M0 3.795l2.995-2.98 11.132 11.185-11.132 11.186-2.995-2.981 8.167-8.205-8.167-8.205zm18.04 8.205l-8.167 8.205 2.995 2.98 11.132-11.185-11.132-11.186-2.995 2.98 8.167 8.206z" />
    </svg>
  );
}

export default memo(ArrowRightDouble);
