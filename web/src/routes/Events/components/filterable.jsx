import { h } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';
import Link from '../../../components/Link';
import { route } from 'preact-router';

const Filterable = ({ onFilter, pathname, searchParams, paramName, name, removeDefaultSearchKeys }) => {
  const href = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, name);
    removeDefaultSearchKeys(params);
    return `${pathname}?${params.toString()}`;
  }, [searchParams, paramName, pathname, name, removeDefaultSearchKeys]);

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
};

export default Filterable;
