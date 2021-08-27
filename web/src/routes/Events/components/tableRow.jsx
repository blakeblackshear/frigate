import { h, Fragment } from 'preact';
import { useCallback, useEffect, useState, useRef } from 'preact/hooks';
import { Tr, Td } from '../../../components/Table';
import Filterable from './filterable';
import Event from '../../Event';
import { useIntersectionObserver } from '../../../hooks';
import { memo } from 'preact/compat';
import { useSearchString } from '../hooks/useSearchString';

const EventsRow = memo(
  (
    {
      id,
      apiHost,
      start_time: startTime,
      end_time: endTime,
      handleFilter,
      reachedEnd,
      scrollToRef,
      pathname,
      searchParams,
      camera,
      label,
      score,
      zones,
      numberOfEvents,
      limit,
      idx,
    },
    i
  ) => {
    const [viewEvent, setViewEvent] = useState(null);
    const [searchString, setSearchString, removeDefaultSearchKeys] = useSearchString(limit);
    // const ref = useRef();

    const viewEventHandler = useCallback(
      (id) => {
        //Toggle event view
        if (viewEvent === id) return setViewEvent(null);

        //Set event id to be rendered.
        setViewEvent(id);
      },
      [viewEvent]
    );

    // useEffect(() => {
    //   const checkIfClickedOutside = (e) => {
    //     // If the menu is open and the clicked target is not within the menu,
    //     // then close the menu
    //     if (viewEvent && ref.current && !ref.current.contains(e.target)) {
    //       setViewEvent(null);
    //     }
    //   };
    //   document.addEventListener('mousedown', checkIfClickedOutside);
    //   return () => {
    //     // Cleanup the event listener
    //     document.removeEventListener('mousedown', checkIfClickedOutside);
    //   };
    // }, [setViewEvent, viewEvent]);

    const [entry, setIntersectNode] = useIntersectionObserver();

    const lastCellRef = useCallback(
      (node) => {
        if (node !== null && !reachedEnd) {
          setIntersectNode(node);
        }
      },
      [setIntersectNode, reachedEnd]
    );

    useEffect(() => {
      if (entry && entry.isIntersecting) {
        const { startTime } = entry.target.dataset;
        const { searchParams } = new URL(window.location);
        searchParams.set('before', parseFloat(startTime) - 0.0001);
        setSearchString(limit, searchParams.toString());
      }
    }, [entry, limit]);

    const start = new Date(parseInt(startTime * 1000, 10));
    const end = new Date(parseInt(endTime * 1000, 10));
    const ref = idx === numberOfEvents - 1 ? lastCellRef : undefined;

    console.log('table row renders');

    return (
      <Fragment key={id}>
        <Tr data-testid={`event-${id}`} className={`${viewEvent === id ? 'border-none' : ''}`}>
          <Td className="w-40">
            <a onClick={() => viewEventHandler(id)} ref={ref} data-start-time={startTime} data-reached-end={reachedEnd}>
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
      // <Fragment>
      //   <Tr>
      //     <Td className="w-40">
      //       <a
      //         onClick={() => viewEventHandler(id)}
      //         ref={lastCellRef}
      //         data-start-time={startTime}
      //         data-reached-end={reachedEnd}
      //       >
      //         <img
      //           ref={(el) => (scrollToRef[id] = el)}
      //           width="150"
      //           height="150"
      //           className="cursor-pointer"
      //           style="min-height: 48px; min-width: 48px;"
      //           src={`${apiHost}/api/events/${id}/thumbnail.jpg`}
      //         />
      //       </a>
      //     </Td>
      //     {viewEvent === id ? (
      //       <span ref={ref}>
      //         <Tr className="border-b-1">
      //           <Td colSpan="8">
      //             <Event eventId={id} close={() => setViewEvent(null)} scrollRef={scrollToRef} />
      //           </Td>
      //         </Tr>
      //       </span>
      //     ) : null}
      //   </Tr>
      // </Fragment>
    );
  }
);

export default EventsRow;
