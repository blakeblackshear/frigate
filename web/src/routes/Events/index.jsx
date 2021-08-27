import { h, Fragment } from 'preact';
import ActivityIndicator from '../../components/ActivityIndicator';
import Heading from '../../components/Heading';
import { TableHead, Filters } from './components';
import { route } from 'preact-router';
import TableRow from './components/tableRow';
import { FetchStatus, useApiHost, useEvents } from '../../api';
import { Table, Tbody, Tfoot, Tr, Td } from '../../components/Table';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'preact/hooks';
import { reducer, initialState } from './reducer';
import { useSearchString } from './hooks/useSearchString';

const API_LIMIT = 25;

export default function Events({ path: pathname, limit = API_LIMIT } = {}) {
  const apiHost = useApiHost();
  const [searchString, setSearchString, removeDefaultSearchKeys] = useSearchString(limit);

  const [{ events, reachedEnd, searchStrings, deleted }, dispatch] = useReducer(reducer, initialState);

  const { data, status, deletedId } = useEvents(searchString);
  const [counter, setCounter] = useState(0);

  let scrollToRef = useMemo(() => Object, []);

  useEffect(() => {
    if (data && !(searchString in searchStrings)) {
      dispatch({ type: 'APPEND_EVENTS', payload: data, meta: { searchString } });
    }

    if (data && Array.isArray(data) && data.length + deleted < limit) {
      dispatch({ type: 'REACHED_END', meta: { searchString } });
    }

    if (deletedId) {
      dispatch({ type: 'DELETE_EVENT', deletedId });
    }
  }, [data, limit, searchString, searchStrings, deleted, deletedId]);

  useEffect(() => {
    setInterval(() => {
      setCounter((prev) => prev + 1);
    }, 1000);
  }, []);

  const handleFilter = useCallback(
    (searchParams) => {
      dispatch({ type: 'RESET' });
      removeDefaultSearchKeys(searchParams);
      setSearchString(limit, searchParams.toString());
      route(`${pathname}?${searchParams.toString()}`);
    },
    [limit, pathname, setSearchString, removeDefaultSearchKeys]
  );

  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);

  console.log('counter ' + counter);
  return (
    <div className="space-y-4 w-full">
      <Heading>Events</Heading>

      <Filters onChange={handleFilter} searchParams={searchParams} />

      <div className="min-w-0 overflow-auto">
        <Table className="min-w-full table-fixed">
          <TableHead />
          <Tbody>
            {events.map(({ id, ...rest }, idx) => {
              return (
                <TableRow
                  key={id}
                  idx={idx}
                  numberOfEvents={events.length}
                  id={id}
                  apiHost={apiHost}
                  scrollToRef={scrollToRef}
                  pathname={pathname}
                  searchParams={searchParams}
                  limit={API_LIMIT}
                  setSearchString={setSearchString}
                  handleFilter={handleFilter}
                  {...rest}
                />
              );
            })}
          </Tbody>
          <Tfoot>
            <Tr>
              <Td className="text-center p-4" colSpan="8">
                {status === FetchStatus.LOADING ? <ActivityIndicator /> : reachedEnd ? 'No more events' : null}
              </Td>
            </Tr>
          </Tfoot>
        </Table>
      </div>
    </div>
  );
}
