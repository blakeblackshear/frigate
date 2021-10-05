import { h } from 'preact';

export function Table({ children, className = '' }) {
  return (
    <table className={`table-auto border-collapse text-gray-900 dark:text-gray-200 ${className}`}>{children}</table>
  );
}

export function Thead({ children, className, ...attrs }) {
  return (
    <thead className={className} {...attrs}>
      {children}
    </thead>
  );
}

export function Tbody({ children, className, reference, ...attrs }) {
  return (
    <tbody ref={reference} className={className} {...attrs}>
      {children}
    </tbody>
  );
}

export function Tfoot({ children, className = '', ...attrs }) {
  return (
    <tfoot className={`${className}`} {...attrs}>
      {children}
    </tfoot>
  );
}

export function Tr({ children, className = '', reference, ...attrs }) {
  return (
    <tr
      ref={reference}
      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
      {...attrs}
    >
      {children}
    </tr>
  );
}

export function Th({ children, className = '', colspan, ...attrs }) {
  return (
    <th className={`border-b border-gray-400 p-2 px-1 lg:p-4 text-left ${className}`} colSpan={colspan} {...attrs}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', reference, colspan, ...attrs }) {
  return (
    <td ref={reference} className={`p-2 px-1 lg:p-4 ${className}`} colSpan={colspan} {...attrs}>
      {children}
    </td>
  );
}
