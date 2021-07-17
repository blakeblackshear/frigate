import { h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import ArrowRight from '../icons/ArrowRight';
import ArrowRightDouble from '../icons/ArrowRightDouble';

let oneDay = 60 * 60 * 24 * 1000;
let todayTimestamp = Date.now() - (Date.now() % oneDay) + new Date().getTimezoneOffset() * 1000 * 60;

const Calender = ({ onChange, calenderRef }) => {
  const inputRef = useRef();
  // const inputRefs = useRef();
  let date = new Date();
  let year = date.getFullYear();
  let month = date.getMonth();

  const [state, setState] = useState({
    getMonthDetails: [],
    year,
    month,
    selectedDay: null,
    selectedRange: { before: null, after: null },
    selectedRangeBefore: false,
    monthDetails: null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    setState((prev) => ({ ...prev, selectedDay: todayTimestamp, monthDetails: getMonthDetails(year, month) }));
  }, []);

  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthMap = [
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
  ];

  const getDayDetails = (args) => {
    let date = args.index - args.firstDay;
    let day = args.index % 7;
    let prevMonth = args.month - 1;
    let prevYear = args.year;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear--;
    }
    let prevMonthNumberOfDays = getNumberOfDays(prevYear, prevMonth);
    let _date = (date < 0 ? prevMonthNumberOfDays + date : date % args.numberOfDays) + 1;
    let month = date < 0 ? -1 : date >= args.numberOfDays ? 1 : 0;
    let timestamp = new Date(args.year, args.month, _date).getTime();
    return {
      date: _date,
      day,
      month,
      timestamp,
      dayString: daysMap[day],
    };
  };

  const getNumberOfDays = (year, month) => {
    return 40 - new Date(year, month, 40).getDate();
  };

  const getMonthDetails = (year, month) => {
    let firstDay = new Date(year, month).getDay();
    let numberOfDays = getNumberOfDays(year, month);
    let monthArray = [];
    let rows = 6;
    let currentDay = null;
    let index = 0;
    let cols = 7;

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
  };

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

  const getDateFromDateString = (dateValue) => {
    const dateData = dateValue.split('-').map((d) => parseInt(d, 10));
    if (dateData.length < 3) return null;

    const year = dateData[0];
    const month = dateData[1];
    const date = dateData[2];
    return { year, month, date };
  };

  const getMonthStr = (month) => monthMap[Math.max(Math.min(11, month), 0)] || 'Month';

  const getDateStringFromTimestamp = (timestamp) => {
    let dateObject = new Date(timestamp);
    let month = dateObject.getMonth() + 1;
    let date = dateObject.getDate();
    return dateObject.getFullYear() + '-' + (month < 10 ? '0' + month : month) + '-' + (date < 10 ? '0' + date : date);
  };

  const setDate = (dateData) => {
    let selectedDay = new Date(dateData.year, dateData.month - 1, dateData.date).getTime();
    setState((prev) => ({ ...prev, selectedDay }));

    if (onChange) {
      // onChange(selectedDay);
    }
  };

  const updateDateFromInput = () => {
    let dateValue = inputRef.current.value;
    let dateData = getDateFromDateString(dateValue);
    if (dateData !== null) {
      setDate(dateData);
      setState(
        (prev = {
          ...prev,
          year: dateData.year,
          month: dateData.month - 1,
          monthDetails: getMonthDetails(dateData.year, dateData.month - 1),
        })
      );
    }
  };

  // const setDateToInput = (timestamp) => {
  //   const dateString = getDateStringFromTimestamp(timestamp);
  //   inputRef.current.value = dateString;
  // };

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

    // setDateToInput(day.timestamp);
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
    const year = state.year;
    const month = state.month + offset;
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

  /**
   *  Renderers
   */

  const renderCalendar = () => {
    let days =
      state.monthDetails &&
      state.monthDetails.map((day, index) => {
        return (
          <div
            onClick={() => onDateClick(day)}
            className={
              'h-12 w-12 float-left flex flex-shrink justify-center items-center cursor-pointer ' +
              (day.month !== 0 ? ' opacity-50 bg-gray-700 dark:bg-gray-700 pointer-events-none' : '') +
              (isCurrentDay(day) ? 'rounded-full bg-gray-100 dark:hover:bg-gray-100 ' : '') +
              (isSelectedDay(day) ? 'bg-gray-100 dark:hover:bg-gray-100' : '') +
              (isSelectedRange(day) ? ' bg-blue-500 dark:hover:bg-blue-500' : '')
            }
            key={index}
          >
            <div className=" font-light ">
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
