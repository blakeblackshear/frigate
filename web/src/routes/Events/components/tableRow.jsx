import { h, Fragment } from 'preact';
import { memo } from 'preact/compat';
import { useCallback, useState, useMemo } from 'preact/hooks';
import { Tr, Td } from '../../../components/Table';
import Filterable from './filterable';
import Event from '../../Event';
import { useSearchString } from '../hooks/useSearchString';

const EventsRow = memo(
  ({
    id,
    apiHost,
    start_time: startTime,
    end_time: endTime,
    scrollToRef,
    lastRowRef,
    handleFilter,
    pathname,
    limit,
    camera,
    label,
    top_score: score,
    zones,
  }) => {
    const [viewEvent, setViewEvent] = useState(null);
    const { searchString, removeDefaultSearchKeys } = useSearchString(limit);
    const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);

    const viewEventHandler = useCallback(
      (id) => {
        //Toggle event view
        if (viewEvent === id) return setViewEvent(null);
        //Set event id to be rendered.
        setViewEvent(id);
      },
      [viewEvent]
    );

    const start = new Date(parseInt(startTime * 1000, 10));
    const end = new Date(parseInt(endTime * 1000, 10));
    console.log('tablerow has been rendered');
    return (
      <Fragment key={id}>
        <Tr data-testid={`event-${id}`} className={`${viewEvent === id ? 'border-none' : ''}`}>
          <Td className="w-40">
            <a
              onClick={() => viewEventHandler(id)}
              ref={lastRowRef}
              data-start-time={startTime}
              // data-reached-end={reachedEnd}
            >
              <img
                ref={(el) => (scrollToRef[id] = el)}
                width="150"
                height="150"
                className="cursor-pointer"
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
              removeDefaultSearchKeys={removeDefaultSearchKeys}
            />
          </Td>
          <Td>
            <Filterable
              onFilter={handleFilter}
              pathname={pathname}
              searchParams={searchParams}
              paramName="label"
              name={label}
              removeDefaultSearchKeys={removeDefaultSearchKeys}
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
                    removeDefaultSearchKeys={removeDefaultSearchKeys}
                  />
                </li>
              ))}
            </ul>
          </Td>
          <Td>{start.toLocaleDateString()}</Td>
          <Td>{start.toLocaleTimeString()}</Td>
          <Td>{end.toLocaleTimeString()}</Td>
        </Tr>
        {viewEvent === id ? (
          <Tr className="border-b-1">
            <Td colSpan="8">
              <Event eventId={id} close={() => setViewEvent(null)} scrollRef={scrollToRef} />
            </Td>
          </Tr>
        ) : null}
      </Fragment>
    );
  }
);

export default EventsRow;
