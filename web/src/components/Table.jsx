import { h } from 'preact';

export function Table({ children, className = '' }) {
  return (
    <table className={`table-auto border-collapse text-gray-900 dark:text-gray-200 ${className}`}>{children}</table>
  );
}

export function Thead({ children, className }) {
  return <thead className={className}>{children}</thead>;
}

export function Tbody({ children, className }) {
  return <tbody className={className}>{children}</tbody>;
}

export function Tfoot({ children, className = '' }) {
  return <tfoot className={`${className}`}>{children}</tfoot>;
}

export function Tr({ children, className = '' }) {
  return (
    <tr
      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
    >
      {children}
    </tr>
  );
}

export function Th({ children, className = '', colspan }) {
  return (
    <th className={`border-b border-gray-400 p-2 px-1 lg:p-4 text-left ${className}`} colSpan={colspan}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', colspan }) {
  return (
    <td className={`p-2 px-1 lg:p-4 ${className}`} colSpan={colspan}>
      {children}
    </td>
  );
}
