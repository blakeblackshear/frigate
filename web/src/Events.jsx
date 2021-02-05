import { h } from 'preact';
import ActivityIndicator from './components/ActivityIndicator';
import Card from './components/Card';
import Heading from './components/Heading';
import Link from './components/Link';
import Select from './components/Select';
import produce from 'immer';
import { route } from 'preact-router';
import { FetchStatus, useApiHost, useConfig, useEvents } from './api';
import { Table, Thead, Tbody, Tfoot, Th, Tr, Td } from './components/Table';
import { useCallback, useContext, useEffect, useMemo, useRef, useReducer, useState } from 'preact/hooks';

const API_LIMIT = 25;

const initialState = Object.freeze({ events: [], reachedEnd: false, searchStrings: {} });
const reducer = (state = initialState, action) => {
  switch (action.type) {
    case 'APPEND_EVENTS': {
      const {
        meta: { searchString },
        payload,
      } = action;
      return produce(state, (draftState) => {
        draftState.searchStrings[searchString] = true;
        draftState.events.push(...payload);
      });
    }

    case 'REACHED_END': {
      const {
        meta: { searchString },
      } = action;
      return produce(state, (draftState) => {
        draftState.reachedEnd = true;
        draftState.searchStrings[searchString] = true;
      });
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
};

const defaultSearchString = `include_thumbnails=0&limit=${API_LIMIT}`;
function removeDefaultSearchKeys(searchParams) {
  searchParams.delete('limit');
  searchParams.delete('include_thumbnails');
  searchParams.delete('before');
}

export default function Events({ path: pathname } = {}) {
  const apiHost = useApiHost();
  const [{ events, reachedEnd, searchStrings }, dispatch] = useReducer(reducer, initialState);
  const { searchParams: initialSearchParams } = new URL(window.location);
  const [searchString, setSearchString] = useState(`${defaultSearchString}&${initialSearchParams.toString()}`);
  const { data, status } = useEvents(searchString);

  useEffect(() => {
    if (data && !(searchString in searchStrings)) {
      dispatch({ type: 'APPEND_EVENTS', payload: data, meta: { searchString } });
    }
    if (Array.isArray(data) && data.length < API_LIMIT) {
      dispatch({ type: 'REACHED_END', meta: { searchString } });
    }
  }, [data]);

  const observer = useRef(
    new IntersectionObserver((entries, observer) => {
      window.requestAnimationFrame(() => {
        if (entries.length === 0) {
          return;
        }
        // under certain edge cases, a ref may be applied / in memory twice
        // avoid fetching twice by grabbing the last observed entry only
        const entry = entries[entries.length - 1];
        if (entry.isIntersecting) {
          const { startTime } = entry.target.dataset;
          const { searchParams } = new URL(window.location);
          searchParams.set('before', parseFloat(startTime) - 0.0001);

          setSearchString(`${defaultSearchString}&${searchParams.toString()}`);
        }
      });
    })
  );

  const lastCellRef = useCallback(
    (node) => {
      if (node !== null) {
        observer.current.disconnect();
        if (!reachedEnd) {
          observer.current.observe(node);
        }
      }
    },
    [observer.current, reachedEnd]
  );

  const handleFilter = useCallback(
    (searchParams) => {
      dispatch({ type: 'RESET' });
      removeDefaultSearchKeys(searchParams);
      setSearchString(`${defaultSearchString}&${searchParams.toString()}`);
      route(`${pathname}?${searchParams.toString()}`);
    },
    [pathname, setSearchString]
  );

  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);

  return (
    <div className="space-y-4 w-full">
      <Heading>Events</Heading>

      <Filters onChange={handleFilter} searchParams={searchParams} />

      <div className="min-w-0 overflow-auto">
        <Table className="min-w-full table-fixed">
          <Thead>
            <Tr>
              <Th></Th>
              <Th>Camera</Th>
              <Th>Label</Th>
              <Th>Score</Th>
              <Th>Zones</Th>
              <Th>Date</Th>
              <Th>Start</Th>
              <Th>End</Th>
            </Tr>
          </Thead>
          <Tbody>
            {events.map(
              (
                { camera, id, label, start_time: startTime, end_time: endTime, thumbnail, top_score: score, zones },
                i
              ) => {
                const start = new Date(parseInt(startTime * 1000, 10));
                const end = new Date(parseInt(endTime * 1000, 10));
                const ref = i === events.length - 1 ? lastCellRef : undefined;
                return (
                  <Tr key={id}>
                    <Td className="w-40">
                      <a href={`/events/${id}`} ref={ref} data-start-time={startTime} data-reached-end={reachedEnd}>
                        <img
                          width="150"
                          height="150"
                          style="min-height: 48px; min-width: 48px;"
                          src={`${apiHost}/api/events/${id}/thumbnail.jpg`}
                        />
                      </a>
                    </Td>
                    <Td>
                      <Filterable
                        onFilter={handleFilter}
                        pathname={pathname}
                        searchParams={searchParams}
                        paramName="camera"
                        name={camera}
                      />
                    </Td>
                    <Td>
                      <Filterable
                        onFilter={handleFilter}
                        pathname={pathname}
                        searchParams={searchParams}
                        paramName="label"
                        name={label}
                      />
                    </Td>
                    <Td>{(score * 100).toFixed(2)}%</Td>
                    <Td>
                      <ul>
                        {zones.map((zone) => (
                          <li>
                            <Filterable
                              onFilter={handleFilter}
                              pathname={pathname}
                              searchParams={searchString}
                              paramName="zone"
                              name={zone}
                            />
                          </li>
                        ))}
                      </ul>
                    </Td>
                    <Td>{start.toLocaleDateString()}</Td>
                    <Td>{start.toLocaleTimeString()}</Td>
                    <Td>{end.toLocaleTimeString()}</Td>
                  </Tr>
                );
              }
            )}
          </Tbody>
          <Tfoot>
            <Tr>
              <Td className="text-center p-4" colspan="8">
                {status === FetchStatus.LOADING ? <ActivityIndicator /> : reachedEnd ? 'No more events' : null}
              </Td>
            </Tr>
          </Tfoot>
        </Table>
      </div>
    </div>
  );
}

function Filterable({ onFilter, pathname, searchParams, paramName, name }) {
  const href = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, name);
    removeDefaultSearchKeys(params);
    return `${pathname}?${params.toString()}`;
  }, [searchParams]);

  const handleClick = useCallback(
    (event) => {
      event.preventDefault();
      route(href, true);
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramName, name);
      onFilter(params);
    },
    [href, searchParams]
  );

  return (
    <Link href={href} onclick={handleClick}>
      {name}
    </Link>
  );
}

function Filters({ onChange, searchParams }) {
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
    <div className="flex space-x-8">
      <Filter onChange={onChange} options={cameras} paramName="camera" searchParams={searchParams} />
      <Filter onChange={onChange} options={zones} paramName="zone" searchParams={searchParams} />
      <Filter onChange={onChange} options={labels} paramName="label" searchParams={searchParams} />
    </div>
  );
}

function Filter({ onChange, searchParams, paramName, options }) {
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
}
