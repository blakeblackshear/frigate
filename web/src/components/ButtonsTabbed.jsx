import { h } from 'preact';
import { useCallback } from 'preact/hooks';

export default function ButtonsTabbed({ titles = [], viewMode, setViewMode }) {
  const className = 'text-gray-600 py-0 px-4 block hover:text-gray-500';

  const handleClick = useCallback((i) => {
    setViewMode(titles[i]);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="flex justify-end">
      {titles.map((title, i) => {
        return (
          <button
            autoFocus={!i}
            onClick={() => handleClick(i)}
            className={viewMode === title
              ? `${className} focus:outline-none border-b-2 font-medium border-gray-500`
              : className
            }
          >
            {`${title.charAt(0).toUpperCase()}${title.slice(1)}`}
          </button>
        );
      })}
    </nav>
  );
}
