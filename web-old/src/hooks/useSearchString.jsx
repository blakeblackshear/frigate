import { useState, useCallback } from 'preact/hooks';

const defaultSearchString = (limit) => `include_thumbnails=0&limit=${limit}`;

export const useSearchString = (limit, searchParams) => {
  const { searchParams: initialSearchParams } = new URL(window.location);
  const _searchParams = searchParams || initialSearchParams.toString();

  const [searchString, changeSearchString] = useState(`${defaultSearchString(limit)}&${_searchParams}`);

  const setSearchString = useCallback(
    (limit, searchString) => {
      changeSearchString(`${defaultSearchString(limit)}&${searchString}`);
    },
    [changeSearchString]
  );

  const removeDefaultSearchKeys = useCallback((searchParams) => {
    searchParams.delete('limit');
    searchParams.delete('include_thumbnails');
    // removed deletion of "before" as its used by DatePicker
    // searchParams.delete('before');
  }, []);

  return { searchString, setSearchString, removeDefaultSearchKeys };
};
