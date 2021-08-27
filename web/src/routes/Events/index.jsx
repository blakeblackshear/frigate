import { h } from 'preact';
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
import { useIntersectionObserver } from '../../hooks';

const API_LIMIT = 25;

export default function Events({ path: pathname, limit = API_LIMIT } = {}) {
  const apiHost = useApiHost();
  const [searchString, setSearchString, removeDefaultSearchKeys] = useSearchString(limit);

  const [{ events, reachedEnd, searchStrings, deleted }, dispatch] = useReducer(reducer, initialState);

  const { data, status, deletedId } = useEvents(searchString);
  const [counter, setCounter] = useState(0);

  const scrollToRef = useMemo(() => Object, []);

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

  const [entry, setIntersectNode] = useIntersectionObserver();

  useEffect(() => {
    if (entry && entry.isIntersecting) {
      const { startTime } = entry.target.dataset;
      const { searchParams } = new URL(window.location);
      searchParams.set('before', parseFloat(startTime) - 0.0001);
      setSearchString(limit, searchParams.toString());
    }
  }, [entry, limit, setSearchString]);

  const lastCellRef = useCallback(
    (node) => {
      if (node !== null && !reachedEnd) {
        setIntersectNode(node);
      }
    },
    [setIntersectNode, reachedEnd]
  );

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

  const RenderTableRow = useCallback(
    (props) => (
      <TableRow
        key={props.id}
        apiHost={apiHost}
        scrollToRef={scrollToRef}
        reachedEnd={reachedEnd}
        setSearchString={setSearchString}
        pathname={pathname}
        searchParams={searchParams}
        limit={API_LIMIT}
        searchString={searchString}
        handleFilter={handleFilter}
        removeDefaultSearchKeys={removeDefaultSearchKeys}
        {...props}
      />
    ),
    [
      reachedEnd,
      apiHost,
      setSearchString,
      handleFilter,
      pathname,
      removeDefaultSearchKeys,
      scrollToRef,
      // searchParams,
      // searchString,
    ]
  );
  useEffect(() => {
    setInterval(() => {
      setCounter((prev) => prev + 1);
    }, 1000);
  }, []);

  console.log('main render', counter);
  return (
    <div className="space-y-4 w-full">
      <Heading>Events</Heading>

      <Filters onChange={handleFilter} searchParams={searchParams} />

      <div className="min-w-0 overflow-auto">
        <Table className="min-w-full table-fixed">
          <TableHead />
          <Tbody>
            {events.map((props, idx) => {
              const lastRowRef = idx === events.length - 1 ? lastCellRef : undefined;
              return <RenderTableRow {...props} lastRowRef={lastRowRef} idx={idx} />;
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
