import { h } from 'preact';

const noop = () => {};

export default function Button({ children, className, color = 'blue', onClick, size, ...attrs }) {
  return (
    <div
      role="button"
      tabindex="0"
      className={`rounded bg-${color}-500 text-white pl-4 pr-4 pt-2 pb-2 font-bold shadow hover:bg-${color}-400 hover:shadow-lg cursor-pointer ${className}`}
      onClick={onClick || noop}
      {...attrs}
    >
      {children}
    </div>
  );
}
