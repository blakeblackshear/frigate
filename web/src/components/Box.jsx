import { h } from 'preact';

export default function Box({ children, className = '', hover = false, href, ...props }) {
  const Element = href ? 'a' : 'div';
  return (
    <Element
      className={`bg-white dark:bg-gray-700 shadow-lg rounded-lg p-2 lg:p-4 ${
        hover ? 'hover:bg-gray-300 hover:dark:bg-gray-500 dark:hover:text-gray-900 dark:hover:text-gray-900' : ''
      } ${className}`}
      href={href}
      {...props}
    >
      {children}
    </Element>
  );
}
