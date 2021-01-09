import { h } from 'preact';

const noop = () => {};

export default function Button({ children, color, onClick, size }) {
  return (
    <div
      role="button"
      tabindex="0"
      className="rounded bg-blue-500 text-white pl-4 pr-4 pt-2 pb-2 font-bold shadow hover:bg-blue-400 hover:shadow-lg cursor-pointer"
      onClick={onClick || noop}
    >
      {children}
    </div>
  );
}
