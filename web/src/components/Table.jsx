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

export function Tr({ children, className = '', index }) {
  return <tr className={`${index % 2 ? 'bg-gray-200 dark:bg-gray-600' : ''} ${className}`}>{children}</tr>;
}

export function Th({ children, className = '', colspan }) {
  return (
    <th className={`border-b-2 border-gray-400 p-1 md:p-2 text-left ${className}`} colspan={colspan}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', colspan }) {
  return (
    <td className={`p-1 md:p-2 ${className}`} colspan={colspan}>
      {children}
    </td>
  );
}
