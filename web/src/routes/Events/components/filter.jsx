import { h } from 'preact';
import Select from '../../../components/Select';
import { useCallback } from 'preact/hooks';

function Filter({ onChange, searchParams, paramName, options, type, ...rest }) {
  const handleSelect = useCallback(
    (key) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.keys(key).map((entries) => {
        if (key[entries] !== 'all') {
          newParams.set(entries, key[entries]);
        } else {
          paramName.map((p) => newParams.delete(p));
        }
      });

      onChange(newParams);
    },
    [searchParams, paramName, onChange]
  );

  const obj = {};
  paramName.map((p) => Object.assign(obj, { [p]: searchParams.get(p) }), [searchParams]);

  return (
    <Select onChange={handleSelect} options={options} selected={obj} paramName={paramName} type={type} {...rest} />
  );
}
export default Filter;
