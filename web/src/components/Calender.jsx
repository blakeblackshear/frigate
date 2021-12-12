import { h } from 'preact';
import { useEffect, useState, useCallback, useMemo, useRef } from 'preact/hooks';
import ArrowRight from '../icons/ArrowRight';
import ArrowRightDouble from '../icons/ArrowRightDouble';

const todayTimestamp = new Date().setHours(0, 0, 0, 0).valueOf();

const Calender = ({ onChange, calenderRef, close }) => {
  const keyRef = useRef([]);

  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();

  const daysMap = useMemo(() => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], []);
  const monthMap = useMemo(
    () => [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    []
  );

  const [state, setState] = useState({
    getMonthDetails: [],
    year,
    month,
    selectedDay: null,
    timeRange: { before: null, after: null },
    monthDetails: null,
  });

  const getNumberOfDays = useCallback((year, month) => {
    return 40 - new Date(year, month, 40).getDate();
  }, []);

  const getDayDetails = useCallback(
    (args) => {
      const date = args.index - args.firstDay;
      const day = args.index % 7;
      let prevMonth = args.month - 1;
      let prevYear = args.year;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear--;
      }
      const prevMonthNumberOfDays = getNumberOfDays(prevYear, prevMonth);
      const _date = (date < 0 ? prevMonthNumberOfDays + date : date % args.numberOfDays) + 1;
      const month = date < 0 ? -1 : date >= args.numberOfDays ? 1 : 0;
      const timestamp = new Date(args.year, args.month, _date).getTime();
      return {
        date: _date,
        day,
        month,
        timestamp,
        dayString: daysMap[day],
      };
    },
    [getNumberOfDays, daysMap]
  );

  const getMonthDetails = useCallback(
    (year, month) => {
      const firstDay = new Date(year, month).getDay();
      const numberOfDays = getNumberOfDays(year, month);
      const monthArray = [];
      const rows = 6;
      let currentDay = null;
      let index = 0;
      const cols = 7;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          currentDay = getDayDetails({
            index,
            numberOfDays,
            firstDay,
            year,
            month,
          });
          monthArray.push(currentDay);
          index++;
        }
      }
      return monthArray;
    },
    [getNumberOfDays, getDayDetails]
  );

  useEffect(() => {
    setState((prev) => ({ ...prev, selectedDay: todayTimestamp, monthDetails: getMonthDetails(year, month) }));
  }, [year, month, getMonthDetails]);

  useEffect(() => {
    // add refs for keyboard navigation
    if (state.monthDetails) {
      keyRef.current = keyRef.current.slice(0, state.monthDetails.length);
    }
    // set today date in focus for keyboard navigation
    const todayDate = new Date(todayTimestamp).getDate();
    keyRef.current.find((t) => t.tabIndex === todayDate)?.focus();
  }, [state.monthDetails]);

  const isCurrentDay = (day) => day.timestamp === todayTimestamp;

  const isSelectedRange = useCallback(
    (day) => {
      if (!state.timeRange.after || !state.timeRange.before) return;

      return day.timestamp < state.timeRange.before && day.timestamp >= state.timeRange.after;
    },
    [state.timeRange]
  );

  const isFirstDayInRange = useCallback(
    (day) => {
      if (isCurrentDay(day)) return;
      return state.timeRange.after === day.timestamp;
    },
    [state.timeRange.after]
  );

  const isLastDayInRange = useCallback(
    (day) => {
      return state.timeRange.before === new Date(day.timestamp).setHours(24, 0, 0, 0);
    },
    [state.timeRange.before]
  );

  const getMonthStr = useCallback(
    (month) => {
      return monthMap[Math.max(Math.min(11, month), 0)] || 'Month';
    },
    [monthMap]
  );

  const onDateClick = (day) => {
    const { before, after } = state.timeRange;
    let timeRange = { before: null, after: null };

    // user has selected a date < after, reset values
    if (after === null || day.timestamp < after) {
      timeRange = { before: new Date(day.timestamp).setHours(24, 0, 0, 0), after: day.timestamp };
    }

    // user has selected a date > after
    if (after !== null && before !== new Date(day.timestamp).setHours(24, 0, 0, 0) && day.timestamp > after) {
      timeRange = {
        after,
        before:
          day.timestamp >= todayTimestamp
            ? new Date(todayTimestamp).setHours(24, 0, 0, 0)
            : new Date(day.timestamp).setHours(24, 0, 0, 0),
      };
    }

    // reset values
    if (before === new Date(day.timestamp).setHours(24, 0, 0, 0)) {
      timeRange = { before: null, after: null };
    }

    setState((prev) => ({
      ...prev,
      timeRange,
      selectedDay: day.timestamp,
    }));

    if (onChange) {
      onChange(timeRange.after ? { before: timeRange.before / 1000, after: timeRange.after / 1000 } : ['all']);
    }
  };

  const setYear = useCallback(
    (offset) => {
      const year = state.year + offset;
      const month = state.month;
      setState((prev) => {
        return {
          ...prev,
          year,
          monthDetails: getMonthDetails(year, month),
        };
      });
    },
    [state.year, state.month, getMonthDetails]
  );

  const setMonth = (offset) => {
    let year = state.year;
    let month = state.month + offset;
    if (month === -1) {
      month = 11;
      year--;
    } else if (month === 12) {
      month = 0;
      year++;
    }
    setState((prev) => {
      return {
        ...prev,
        year,
        month,
        monthDetails: getMonthDetails(year, month),
      };
    });
  };

  const handleKeydown = (e, day, index) => {
    if ((keyRef.current && e.key === 'Enter') || e.keyCode === 32) {
      e.preventDefault();
      day.month === 0 && onDateClick(day);
    }
    if (e.key === 'ArrowLeft') {
      index > 0 && keyRef.current[index - 1].focus();
    }
    if (e.key === 'ArrowRight') {
      index < 41 && keyRef.current[index + 1].focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      index > 6 && keyRef.current[index - 7].focus();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      index < 36 && keyRef.current[index + 7].focus();
    }
    if (e.key === 'Escape') {
      close();
    }
  };

  const renderCalendar = () => {
    const days =
      state.monthDetails &&
      state.monthDetails.map((day, idx) => {
        return (
          <div
            onClick={() => onDateClick(day)}
            onkeydown={(e) => handleKeydown(e, day, idx)}
            ref={(ref) => (keyRef.current[idx] = ref)}
            tabIndex={day.month === 0 ? day.date : null}
            className={`h-12 w-12 float-left flex flex-shrink justify-center items-center cursor-pointer ${
              day.month !== 0 ? ' opacity-50 bg-gray-700 dark:bg-gray-700 pointer-events-none' : ''
            }
              ${isFirstDayInRange(day) ? ' rounded-l-xl ' : ''}
              ${isSelectedRange(day) ? ' bg-blue-600 dark:hover:bg-blue-600' : ''}
              ${isLastDayInRange(day) ? ' rounded-r-xl ' : ''}
              ${isCurrentDay(day) && !isLastDayInRange(day) ? 'rounded-full bg-gray-100 dark:hover:bg-gray-100 ' : ''}`}
            key={idx}
          >
            <div className="font-light">
              <span className="text-gray-400">{day.date}</span>
            </div>
          </div>
        );
      });

    return (
      <div>
        <div className="w-full flex justify-start flex-shrink">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
            <div key={i} className="w-12 text-xs font-light text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="w-full h-56">{days}</div>
      </div>
    );
  };

  return (
    <div className="select-none w-96 flex flex-shrink" ref={calenderRef}>
      <div className="py-4 px-6">
        <div className="flex items-center">
          <div className="w-1/6 relative flex justify-around">
            <div
              tabIndex={100}
              className="flex justify-center items-center cursor-pointer absolute  -mt-4 text-center rounded-full w-10 h-10 bg-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => setYear(-1)}
            >
              <ArrowRightDouble className="h-2/6 transform rotate-180 " />
            </div>
          </div>
          <div className="w-1/6 relative flex justify-around ">
            <div
              tabIndex={101}
              className="flex justify-center items-center cursor-pointer absolute  -mt-4 text-center rounded-full w-10 h-10 bg-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => setMonth(-1)}
            >
              <ArrowRight className="h-2/6 transform rotate-180 red" />
            </div>
          </div>
          <div className="w-1/3">
            <div className="text-3xl text-center text-gray-200 font-extralight">{state.year}</div>
            <div className="text-center text-gray-400 font-extralight">{getMonthStr(state.month)}</div>
          </div>
          <div className="w-1/6 relative flex justify-around ">
            <div
              tabIndex={102}
              className="flex justify-center items-center cursor-pointer absolute  -mt-4 text-center rounded-full w-10 h-10 bg-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => setMonth(1)}
            >
              <ArrowRight className="h-2/6" />
            </div>
          </div>
          <div className="w-1/6 relative flex justify-around " tabIndex={104} onClick={() => setYear(1)}>
            <div className="flex justify-center items-center cursor-pointer absolute  -mt-4 text-center rounded-full w-10 h-10 bg-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800">
              <ArrowRightDouble className="h-2/6" />
            </div>
          </div>
        </div>
        <div className="mt-3">{renderCalendar()}</div>
      </div>
    </div>
  );
};

export default Calender;
