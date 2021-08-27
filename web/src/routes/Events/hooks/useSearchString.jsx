import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';

const defaultSearchString = (limit) => `include_thumbnails=0&limit=${limit}`;

export const useSearchString = (limit, searchParams) => {
  const { searchParams: initialSearchParams } = new URL(window.location);
  const _searchParams = searchParams ? searchParams : initialSearchParams.toString();

  const [searchString, setSearchString] = useState(`${defaultSearchString(limit)}&${_searchParams}`);

  const changeSearchString = useCallback(
    (limit, searchString) => {
      setSearchString(`${defaultSearchString(limit)}&${searchString}`);
    },
    [setSearchString, defaultSearchString]
  );

  const removeDefaultSearchKeys = useCallback(
    (searchParams) => {
      searchParams.delete('limit');
      searchParams.delete('include_thumbnails');
      searchParams.delete('before');
    },
    [searchParams]
  );

  return [searchString, changeSearchString, removeDefaultSearchKeys];
};
