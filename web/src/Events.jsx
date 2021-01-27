import { h } from 'preact';
import { ApiHost } from './context';
import Box from './components/Box';
import Heading from './components/Heading';
import Link from './components/Link';
import { route } from 'preact-router';
import { Table, Thead, Tbody, Tfoot, Th, Tr, Td } from './components/Table';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';

export default function Events({ url } = {}) {
  const apiHost = useContext(ApiHost);
  const [events, setEvents] = useState([]);

  const { pathname, searchParams } = new URL(`${window.location.protocol}//${window.location.host}${url || '/events'}`);
  const searchParamsString = searchParams.toString();

  useEffect(async () => {
    const response = await fetch(`${apiHost}/api/events?${searchParamsString}`);
    const data = response.ok ? await response.json() : {};
    setEvents(data);
  }, [searchParamsString]);

  const searchKeys = Array.from(searchParams.keys());

  return (
    <div className="space-y-4 w-full">
      <Heading>Events</Heading>

      {searchKeys.length ? (
        <Box>
          <Heading size="sm">Filters</Heading>
          <div className="flex flex-wrap space-x-2">
            {searchKeys.map((filterKey) => (
              <UnFilterable
                name={`${filterKey}: ${searchParams.get(filterKey)}`}
                paramName={filterKey}
                pathname={pathname}
                searchParams={searchParamsString}
              />
            ))}
          </div>
        </Box>
      ) : null}

      <Box className="min-w-0 overflow-auto">
        <Table className="w-full">
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
                return (
                  <Tr key={id} index={i}>
                    <Td>
                      <a href={`/events/${id}`}>
                        <img className="w-32 max-w-none" src={`data:image/jpeg;base64,${thumbnail}`} />
                      </a>
                    </Td>
                    <Td>
                      <Filterable
                        pathname={pathname}
                        searchParams={searchParamsString}
                        paramName="camera"
                        name={camera}
                      />
                    </Td>
                    <Td>
                      <Filterable
                        pathname={pathname}
                        searchParams={searchParamsString}
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
                              pathname={pathname}
                              searchParams={searchParamsString}
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
        </Table>
      </Box>
    </div>
  );
}

function Filterable({ pathname, searchParams, paramName, name }) {
  const params = new URLSearchParams(searchParams);
  params.set(paramName, name);
  return <Link href={`${pathname}?${params.toString()}`}>{name}</Link>;
}

function UnFilterable({ pathname, searchParams, paramName, name }) {
  const params = new URLSearchParams(searchParams);
  params.delete(paramName);
  return (
    <a
      className="bg-gray-700 text-white px-3 py-1 rounded-md hover:bg-gray-300 hover:text-gray-900 dark:bg-gray-300 dark:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
      href={`${pathname}?${params.toString()}`}
    >
      {name}
    </a>
  );
}
