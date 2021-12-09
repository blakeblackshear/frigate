import { h } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';
import Link from '../../../components/Link';
import { route } from 'preact-router';

function Filterable({ onFilter, pathname, searchParams, paramName, name }) {
  const removeDefaultSearchKeys = useCallback((searchParams) => {
    searchParams.delete('limit');
    searchParams.delete('include_thumbnails');
    // searchParams.delete('before');
  }, []);

  const href = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, name);
    removeDefaultSearchKeys(params);
    return `${pathname}?${params.toString()}`;
  }, [searchParams, paramName, pathname, name]);

  const handleClick = useCallback(
    (event) => {
      event.preventDefault();
      route(href, true);
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramName, name);
      onFilter(params);
    },
    [href, searchParams, onFilter, paramName, name]
  );

  return (
    <Link href={href} onclick={handleClick}>
      {name}
    </Link>
  );
}

export default Filterable;
