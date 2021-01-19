import { h } from 'preact';

export function Table({ children, className = '' }) {
  return (
    <table className={`table-auto border-collapse text-gray-900 dark:text-gray-200 ${className}`}>{children}</table>
  );
}

export function Thead({ children, className = '' }) {
  return <thead className={`${className}`}>{children}</thead>;
}

export function Tbody({ children, className = '' }) {
  return <tbody className={`${className}`}>{children}</tbody>;
}

export function Tfoot({ children, className = '' }) {
  return <tfoot className={`${className}`}>{children}</tfoot>;
}

export function Tr({ children, className = '', index }) {
  return <tr className={`${index % 2 ? 'bg-gray-200 dark:bg-gray-700' : ''} ${className}`}>{children}</tr>;
}

export function Th({ children, className = '' }) {
  return <th className={`border-b-2 border-gray-400 p-4 text-left ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }) {
  return <td className={`p-4 ${className}`}>{children}</td>;
}
