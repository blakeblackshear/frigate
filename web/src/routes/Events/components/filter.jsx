import { h } from 'preact';
import Select from '../../../components/Select';
import { useCallback } from 'preact/hooks';

function Filter({ onChange, searchParams, paramName, options, ...rest }) {
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
  paramName.map((name) => Object.assign(obj, { [name]: searchParams.get(name) }), [searchParams]);
  return <Select onChange={handleSelect} options={options} selected={obj} paramName={paramName} {...rest} />;
}
export default Filter;
