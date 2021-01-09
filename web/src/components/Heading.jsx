import { h } from 'preact';

export default function Heading({ children, className = '', size = '2xl' }) {
  return (
    <h1 className={`font-semibold tracking-widest text-gray-900 uppercase dark:text-white text-${size} ${className}`}>
      {children}
    </h1>
  );
}
