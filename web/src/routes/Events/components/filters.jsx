import { h } from 'preact';
import Filter from './filter';
import { useConfig } from '../../../api';
import { useMemo } from 'preact/hooks';

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
      <Filter onChange={onChange} options={cameras} paramName="camera" searchParams={searchParams} />
      <Filter onChange={onChange} options={zones} paramName="zone" searchParams={searchParams} />
      <Filter onChange={onChange} options={labels} paramName="label" searchParams={searchParams} />
    </div>
  );
};
export default Filters;
