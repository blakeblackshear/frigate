import { h } from 'preact';

const noop = () => {};

const BUTTON_COLORS = {
  blue: { normal: 'bg-blue-500', hover: 'hover:bg-blue-400' },
  red: { normal: 'bg-red-500', hover: 'hover:bg-red-400' },
  green: { normal: 'bg-green-500', hover: 'hover:bg-green-400' },
};

export default function Button({ children, className, color = 'blue', onClick, size, ...attrs }) {
  return (
    <div
      role="button"
      tabindex="0"
      className={`rounded ${BUTTON_COLORS[color].normal} text-white pl-4 pr-4 pt-2 pb-2 font-bold shadow ${BUTTON_COLORS[color].hover} hover:shadow-lg cursor-pointer ${className}`}
      onClick={onClick || noop}
      {...attrs}
    >
      {children}
    </div>
  );
}
