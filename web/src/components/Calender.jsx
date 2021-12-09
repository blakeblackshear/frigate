import { h } from 'preact';
import { useEffect, useState, useCallback, useMemo } from 'preact/hooks';
import ArrowRight from '../icons/ArrowRight';
import ArrowRightDouble from '../icons/ArrowRightDouble';

const oneDay = 60 * 60 * 24 * 1000;
const todayTimestamp = Date.now() - (Date.now() % oneDay) + new Date().getTimezoneOffset() * 1000 * 60;

const Calender = ({ onChange, calenderRef }) => {
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
    selectedRange: { before: null, after: null },
    selectedRangeBefore: false,
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

  const isCurrentDay = (day) => {
    return day.timestamp === todayTimestamp;
  };

  const isSelectedDay = (day) => {
    return day.timestamp === state.selectedDay;
  };
  const isSelectedRange = (day) => {
    if (!state.selectedRange.after || !state.selectedRange.before) return;

    return day.timestamp < state.selectedRange.before * 1000 && day.timestamp >= state.selectedRange.after * 1000;
  };

  const isFirstDayInRange = (day) => {
    if (isCurrentDay(day)) return;
    return state.selectedRange.after * 1000 === day.timestamp;
  };
  const isLastDayInRange = (day) => {
    if (state.selectedRange.after * 1000 === todayTimestamp) return;
    return state.selectedRange.before * 1000 === day.timestamp + 86400000;
  };

  const getMonthStr = (month) => monthMap[Math.max(Math.min(11, month), 0)] || 'Month';

  const onDateClick = (day) => {
    const range = {
      selectedRange: state.selectedRangeBefore
        ? { ...state.selectedRange, before: new Date(day.timestamp).setHours(24, 0, 0, 0) / 1000 }
        : { ...state.selectedRange, after: day.timestamp / 1000 },
    };

    setState((prev) => ({
      ...prev,
      ...range,
      selectedDay: day.timestamp,
      selectedRangeBefore: !state.selectedRangeBefore,
    }));

    if (onChange) {
      onChange({ before: range.selectedRange.before, after: range.selectedRange.after });
    }
  };

  const setYear = (offset) => {
    const year = state.year + offset;
    const month = state.month;
    setState((prev) => {
      return {
        ...prev,
        year,
        monthDetails: getMonthDetails(year, month),
      };
    });
  };

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

  const renderCalendar = () => {
    const days =
      state.monthDetails &&
      state.monthDetails.map((day, index) => {
        return (
          <div
            onClick={() => onDateClick(day)}
            className={`h-12 w-12 float-left flex flex-shrink justify-center items-center cursor-pointer ${
              day.month !== 0 ? ' opacity-50 bg-gray-700 dark:bg-gray-700 pointer-events-none' : ''
            }
              ${isSelectedDay(day) ? 'bg-gray-100 dark:hover:bg-gray-100' : ''}
              ${isFirstDayInRange(day) ? ' rounded-l-xl ' : ''}
              ${isSelectedRange(day) ? ' bg-blue-500 dark:hover:bg-blue-600' : ''}
              ${isLastDayInRange(day) ? ' rounded-r-xl ' : ''}
              ${isCurrentDay(day) ? 'rounded-full bg-gray-100 dark:hover:bg-gray-100 ' : ''}`}
            key={index}
          >
            <div className=" font-light ">
              <span className="text-gray-400 ">{day.date}</span>
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
              className="flex justify-center items-center cursor-pointer absolute  -mt-4 text-center rounded-full w-10 h-10 bg-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => setYear(-1)}
            >
              <ArrowRightDouble className="h-2/6 transform rotate-180 " />
            </div>
          </div>
          <div className="w-1/6 relative flex justify-around ">
            <div
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
              className="flex justify-center items-center cursor-pointer absolute  -mt-4 text-center rounded-full w-10 h-10 bg-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => setMonth(1)}
            >
              <ArrowRight className="h-2/6" />
            </div>
          </div>
          <div className="w-1/6 relative flex justify-around " onClick={() => setYear(1)}>
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
