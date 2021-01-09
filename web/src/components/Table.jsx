import { h } from 'preact';

export function Table({ children }) {
  return <table className="table-auto border-collapse text-gray-900 dark:text-gray-200">{children}</table>;
}

export function Thead({ children }) {
  return <thead className="">{children}</thead>;
}

export function Tbody({ children }) {
  return <tbody className="">{children}</tbody>;
}

export function Tfoot({ children }) {
  return <tfoot className="">{children}</tfoot>;
}

export function Tr({ children, index }) {
  return <tr className={`${index % 2 ? 'bg-gray-200 ' : ''}`}>{children}</tr>;
}

export function Th({ children }) {
  return <th className="border-b-2 border-gray-400 p-4 text-left">{children}</th>;
}

export function Td({ children }) {
  return <td className="p-4">{children}</td>;
}
