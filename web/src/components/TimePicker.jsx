import { h } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { ArrowDropdown } from '../icons/ArrowDropdown';
import { ArrowDropup } from '../icons/ArrowDropup';

const TimePicker = ({ dateRange, onChange }) => {
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(new Set());
  const [hoverIdx, setHoverIdx] = useState(null);
  const [reset, setReset] = useState(false);

  /**
   * Initializes two variables before and after with date objects,
   * If they are not null, it creates a new Date object with the value of the property and if not,
   * it creates a new Date object with the current hours to 0 and 24 respectively.
   */
  const before = useMemo(() => {
    return dateRange.before ? new Date(dateRange.before) : new Date(new Date().setHours(24, 0, 0, 0));
  }, [dateRange]);

  const after = useMemo(() => {
    return dateRange.after ? new Date(dateRange.after) : new Date(new Date().setHours(0, 0, 0, 0));
  }, [dateRange]);

  useEffect(() => {
    /**
     * This will reset hours when user selects another date in the calendar.
     */
    if (before.getHours() === 0 && after.getHours() === 0 && timeRange.size > 1) return setTimeRange(new Set());
  }, [after, before, timeRange]);

  useEffect(() => {
    if (reset || !after) return;
    /**
     * calculates the number of hours between two dates, by finding the difference in days,
     * converting it to hours and adding the hours from the before date.
     */
    const days = Math.max(before.getDate() - after.getDate());
    const hourOffset = days * 24;
    const beforeOffset = before.getHours() ? hourOffset + before.getHours() : 0;

    /**
     * Fills the timeRange by iterating over the hours between 'after' and 'before' during component mount, to keep the selected hours persistent.
     */
    for (let hour = after.getHours(); hour < beforeOffset; hour++) {
      setTimeRange((timeRange) => timeRange.add(hour));
    }

    /**
     * find an element by the id timeIndex- concatenated with the minimum value from timeRange array,
     * and if that element is present, it will scroll into view if needed
     */
    if (timeRange.size > 1) {
      const element = document.getElementById(`timeIndex-${Math.max(...timeRange)}`);
      if (element) {
        element.scrollIntoViewIfNeeded(true);
      }
    }
  }, [after, before, timeRange, reset]);

  /**
   * numberOfDaysSelected is a set that holds the number of days selected in the dateRange.
   * The loop iterates through the days starting from the after date's day to the before date's day.
   * If the before date's hour is 0, it skips it.
   */
  const numberOfDaysSelected = useMemo(() => {
    return new Set([...Array(Math.max(1, before.getDate() - after.getDate() + 1))].map((_, i) => after.getDate() + i));
  }, [before, after]);

  if (before.getHours() === 0) numberOfDaysSelected.delete(before.getDate());

  // Create repeating array with the number of hours for each day selected ...23,24,0,1,2...
  const hoursInDays = useMemo(() => {
    return Array.from({ length: numberOfDaysSelected.size * 24 }, (_, i) => i % 24);
  }, [numberOfDaysSelected]);

  // function for handling the selected time from the provided list
  const handleTime = useCallback(
    (hour) => {
      if (isNaN(hour)) return;

      const _timeRange = new Set([...timeRange]);
      _timeRange.add(hour);

      // reset error messages
      setError(null);

      /**
       * Check if the variable "hour" exists in the "timeRange" set.
       * If it does, reset the timepicker
       */
      if (timeRange.has(hour)) {
        setTimeRange(new Set());
        setReset(true);
        const resetBefore = before.setDate(after.getDate() + numberOfDaysSelected.size - 1);
        return onChange({
          after: after.setHours(0, 0, 0, 0) / 1000,
          before: new Date(resetBefore).setHours(24, 0, 0, 0) / 1000,
        });
      }

      //update after
      if (_timeRange.size === 1) {
        // check if the first selected value is within first day
        const firstSelectedHour = Math.ceil(Math.max(..._timeRange));
        if (firstSelectedHour > 23) {
          return setError('Select a time on the initial day!');
        }

        // calculate days offset
        const dayOffsetAfter = new Date(after).setHours(Math.min(..._timeRange));

        let dayOffsetBefore = before;
        if (numberOfDaysSelected.size === 1) {
          dayOffsetBefore = new Date(after).setHours(Math.min(..._timeRange) + 1);
        }

        onChange({
          after: dayOffsetAfter / 1000,
          before: dayOffsetBefore / 1000,
        });
      }

      //update before
      if (_timeRange.size > 1) {
        let selectedDay = Math.ceil(Math.max(..._timeRange) / 24);

        // if user selects time 00:00 for the next day, add one day
        if (hour === 24 && selectedDay === numberOfDaysSelected.size - 1) {
          selectedDay += 1;
        }

        // Check if end time is on the last day
        if (selectedDay !== numberOfDaysSelected.size) {
          return setError('Ending must occur on final day!');
        }

        // Check if end time is later than start time
        const startHour = Math.min(..._timeRange);
        if (hour <= startHour) {
          return setError('Ending hour must be greater than start time!');
        }

        // Add all hours between start and end times to the set
        for (let x = startHour; x <= hour; x++) {
          _timeRange.add(x);
        }

        // calculate days offset
        const dayOffsetBefore = new Date(dateRange.after);
        onChange({
          after: dateRange.after / 1000,
          // we add one hour to get full 60min of last selected hour
          before: dayOffsetBefore.setHours(Math.max(..._timeRange) + 1) / 1000,
        });
      }

      for (let i = 0; i < _timeRange.size; i++) {
        setTimeRange((timeRange) => timeRange.add(Array.from(_timeRange)[i]));
      }
    },
    [after, before, timeRange, dateRange.after, numberOfDaysSelected.size, onChange]
  );
  const isSelected = useCallback(
    (idx) => {
      return !!timeRange.has(idx);
    },
    [timeRange]
  );

  const isHovered = useCallback(
    (idx) => {
      return timeRange.size === 1 && idx > Math.max(...timeRange) && idx <= hoverIdx;
    },
    [timeRange, hoverIdx]
  );

  // background colors for each day
  const isSelectedCss = 'bg-blue-600 transition duration-300 ease-in-out hover:rounded-none';
  function randomGrayTone(shade) {
    const grayTones = [
      'bg-[#212529]/50',
      'bg-[#343a40]/50',
      'bg-[#495057]/50',
      'bg-[#666463]/50',
      'bg-[#817D7C]/50',
      'bg-[#73706F]/50',
      'bg-[#585655]/50',
      'bg-[#4F4D4D]/50',
      'bg-[#454343]/50',
      'bg-[#363434]/50',
    ];
    return grayTones[shade % grayTones.length];
  }

  return (
    <>
      {error ? <span className="text-red-400 text-center text-xs absolute top-1 right-0 pr-2">{error}</span> : null}
      <div className="mt-2 pr-3 hidden xs:block" aria-label="Calendar timepicker, select a time range">
        <div className="flex items-center justify-center">
          <ArrowDropup className="w-10 text-center" />
        </div>
        <div className="w-20 px-1">
          <div
            className="border border-gray-400/50 cursor-pointer hide-scroll shadow-md rounded-md"
            style={{ maxHeight: '17rem', overflowY: 'scroll' }}
          >
            {hoursInDays.map((_, idx) => (
              <div
                key={idx}
                id={`timeIndex-${idx}`}
                className={`${isSelected(idx) ? isSelectedCss : ''}
                ${isHovered(idx) ? 'opacity-30 bg-slate-900 transition duration-150 ease-in-out' : ''}
                ${Math.min(...timeRange) === idx ? 'rounded-t-lg' : ''}
                ${timeRange.size > 1 && Math.max(...timeRange) === idx ? 'rounded-b-lg' : ''}`}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <div
                  className={`
            text-gray-300 w-full font-light border border-transparent hover:border hover:rounded-md hover:border-gray-600 text-center text-sm
            ${randomGrayTone([Math.floor(idx / 24)])}`}
                  onClick={() => handleTime(idx)}
                >
                  <span aria-label={`${idx}:00`}>{hoursInDays[idx]}:00</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <ArrowDropdown className="w-10 text-center" />
          </div>
        </div>
      </div>
    </>
  );
};

export default TimePicker;
