import { h } from 'preact';
import Select from '../../../components/Select';
import { useCallback, useMemo } from 'preact/hooks';

const Filter = ({ onChange, searchParams, paramName, options }) => {
  const handleSelect = useCallback(
    (key) => {
      const newParams = new URLSearchParams(searchParams.toString());
      if (key !== 'all') {
        newParams.set(paramName, key);
      } else {
        newParams.delete(paramName);
      }

      onChange(newParams);
    },
    [searchParams, paramName, onChange]
  );

  const selectOptions = useMemo(() => ['all', ...options], [options]);

  return (
    <Select
      label={`${paramName.charAt(0).toUpperCase()}${paramName.substr(1)}`}
      onChange={handleSelect}
      options={selectOptions}
      selected={searchParams.get(paramName) || 'all'}
    />
  );
};
export default Filter;
