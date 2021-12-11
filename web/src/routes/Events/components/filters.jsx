import { h } from 'preact';
import Filter from './filter';
import { useConfig } from '../../../api';
import { useMemo, useState } from 'preact/hooks';
import { DateFilterOptions } from '../../../components/DatePicker';
import Button from '../../../components/Button';

const Filters = ({ onChange, searchParams }) => {
  const [viewFilters, setViewFilters] = useState(false);
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
    <div>
      <Button
        onClick={() => setViewFilters(!viewFilters)}
        className="block xs:hidden w-full mb-4 text-center"
        type="text"
      >
        Filters
      </Button>
      <div className={`xs:flex space-y-1 xs:space-y-0 xs:space-x-4  ${viewFilters ? 'flex-col' : 'hidden'}`}>
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
    </div>
  );
};
export default Filters;
