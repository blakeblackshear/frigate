import { h } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import Link from './Link';

export default function ButtonsTabbed({
  viewModes = [''],
  setViewMode = null,
  setHeader = null,
  headers = [''],
  className = 'text-gray-600 py-0 px-4 block hover:text-gray-500',
  selectedClassName = `${className} focus:outline-none border-b-2 font-medium border-gray-500`,
  camera='',
  currentPage=''
}) {
  const [selected, setSelected] = useState(0);
  const captitalize = (str) => { return (`${str.charAt(0).toUpperCase()}${str.slice(1)}`); };

  const getHeader = useCallback((i) => {
    return (headers.length === viewModes.length ? headers[i] : captitalize(viewModes[i]));
  }, [headers, viewModes]);

  const handleClick = useCallback((i) => {
    setSelected(i);
    setViewMode && setViewMode(viewModes[i]);
    setHeader && setHeader(getHeader(i));
  }, [setViewMode, setHeader, setSelected, viewModes, getHeader]);

  setHeader && setHeader(getHeader(selected));

  if(currentPage === '' || currentPage === 'live') {
    return (
      <nav className="flex justify-end">
        {viewModes.map((item, i) => {
          return (
            item === 'recordings' ? (
              <Link className={className} href={`/recording/${camera}`}>Recordings</Link>
            ) : (
              <button onClick={() => handleClick(i)} className={i === selected ? selectedClassName : className}>
                {captitalize(item)}
              </button>
            )
          )
        })}
      </nav>
    );
  } else if (currentPage === 'recording') {
    return (
      <nav className="flex justify-end">
        {viewModes.map((item, i) => {
          return (
            item === 'live' ? (
              <Link className={className} href={`/cameras/${camera}`}>Live</Link>
            ) : (
              <button onClick={() => handleClick(i)} className={selectedClassName}>
                {captitalize(item)}
              </button>
            )
          )
        })}
      </nav>
    );
  } else {
    return (
      <nav className="flex justify-end">
        {viewModes.map((item, i) => {
          return (
            <button onClick={() => handleClick(i)} className={i === selected ? selectedClassName : className}>
              {captitalize(item)}
            </button>
          );
        })}
      </nav>
    );
  }
}
