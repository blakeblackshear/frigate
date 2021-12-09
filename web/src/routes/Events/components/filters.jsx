import { h } from 'preact';
import Filter from './filter';
import { useConfig } from '../../../api';
import { useMemo } from 'preact/hooks';
import { DateFilterOptions } from '../../../components/DatePicker';

const Filters = ({ onChange, searchParams }) => {
  const { data } = useConfig();
  const cameras = useMemo(() => Object.keys(data.cameras), [data]);

  const zones = useMemo(
    () =>
      Object.values(data.cameras)
        .reduce((memo, camera) => {
          memo = memo.concat(Object.keys(camera.zones));
          return memo;
        }, [])
        .filter((value, i, self) => self.indexOf(value) === i),
    [data]
  );

  const labels = useMemo(() => {
    return Object.values(data.cameras)
      .reduce((memo, camera) => {
        memo = memo.concat(camera.objects?.track || []);
        return memo;
      }, data.objects?.track || [])
      .filter((value, i, self) => self.indexOf(value) === i);
  }, [data]);

  return (
    <div className="flex space-x-4">
      <Filter
        type="dropdown"
        onChange={onChange}
        options={['all', ...cameras]}
        paramName={['camera']}
        label="Camera"
        searchParams={searchParams}
      />
      <Filter
        type="dropdown"
        onChange={onChange}
        options={['all', ...zones]}
        paramName={['zone']}
        label="Zone"
        searchParams={searchParams}
      />
      <Filter
        type="dropdown"
        onChange={onChange}
        options={['all', ...labels]}
        paramName={['label']}
        label="Label"
        searchParams={searchParams}
      />
      <Filter
        type="datepicker"
        onChange={onChange}
        options={DateFilterOptions}
        paramName={['before', 'after']}
        label="DatePicker"
        searchParams={searchParams}
      />
    </div>
  );
};
export default Filters;
