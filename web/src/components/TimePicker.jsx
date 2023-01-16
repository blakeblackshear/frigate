import { h } from 'preact';
import { useState } from 'preact/hooks';

const CalendarTimePicker = ({ dateRange, onChange }) => {
  const [selected, setSelected] = useState([0]);

  const timestampHour = (timestamp) => {
    if (!timestamp) return undefined;
    return new Date(timestamp).getHours();
  };

  const handleTime = (number) => {
    const currentHour = new Date();
    currentHour.setHours(number, 0, 0, 0);

    // Get current time if dateRange.after or dateRange.before are not set
    const afterTime = dateRange.after ? dateRange.after : currentHour.getTime();
    const beforetime = afterTime + 1;

    // Update dateRange object with new "before" time and set selected to new number
    if (selected.length === 1 && number > Math.max(...selected)) {
      onChange({
        after: afterTime / 1000,
        before: new Date(afterTime).setHours(number + 1) / 1000,
      });

      return setSelected([number]);
    }

    // Updating the start of the selected range
    if (selected.length > 0 && number < selected[0]) {
      onChange({
        after: new Date(afterTime).setHours(number) / 1000,
        before: dateRange.before / 1000,
      });

      return setSelected([number]);
    }

    // Updating the end of the selected range
    if (selected.length === 2) {
      onChange({
        after: dateRange.after ? dateRange.after / 1000 : 0,
        before: new Date(beforetime) / 1000,
      });

      return setSelected([number]);
    }

    // Update dateRange object with both "after" and "before" times
    if (selected.length === 1) {
      onChange({
        after: new Date(afterTime).setHours(number) / 1000,
        before: new Date(afterTime).setHours(number + 1) / 1000,
      });

      return setSelected([Math.min(selected[0], number), Math.max(selected[0], number)]);
    }
    setSelected([number]);
  };
  const isSelected = (after, before, idx) => {
    if (timestampHour(before) === 0 && timestampHour(after) === 0) return false;

    return timestampHour(after) <= idx && timestampHour(before - 1) >= idx;
  };
  return (
    <div aria-label="Calendar timepicker, select a time range">
      <p className="block text-center font-medium mb-2 text-gray-300">TimePicker</p>
      <div className="w-24 px-1">
        <div
          className="border border-gray-400 cursor-pointer hide-scroll"
          style={{ maxHeight: '23rem', overflowY: 'scroll' }}
        >
          {Array.from({ length: 24 }, (_, idx) => (
            <div
              key={idx}
              className={`w-full font-light border border-transparent hover:border-gray-300 rounded-sm text-center text-lg
              ${isSelected(dateRange.after, dateRange.before, idx) ? 'bg-blue-500' : ''}`}
              onClick={() => handleTime(idx)}
            >
              <span aria-label={`${idx}:00`}>{idx}:00</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarTimePicker;
