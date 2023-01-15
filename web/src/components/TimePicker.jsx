import { h } from 'preact';
import { useState } from 'preact/hooks';
// import './CalendarTimePicker.css';

const CalendarTimePicker = () => {
  const [timeSelector, setTimeSelector] = useState({ After: 0, Before: 0 });

  const handleTime = (name, idx) => {
    setTimeSelector({
      ...timeSelector,
      [name]: idx,
    });
  };

  const renderTimePicker = ({ title, selected }) => {
    return (
      <span>
        <label className="block text-center font-medium mb-2 text-gray-300">{title}</label>
        <div
          className="border border-gray-400 cursor-pointer hide-scroll"
          style={{ maxHeight: '23rem', overflowY: 'scroll' }}
        >
          {Array.from({ length: 24 }, (_, idx) => (
            <div
              key={idx}
              className={`w-full font-light border border-transparent hover:border-gray-300 rounded-sm text-center text-xl ${
                selected === idx ? 'bg-blue-500' : ''
              } `}
              onClick={() => handleTime(title, idx)}
            >
              <span className="">{idx}:00</span>
            </div>
          ))}
        </div>
      </span>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-between ">
        <div className="w-24 px-1">{renderTimePicker({ title: 'Before', selected: timeSelector.Before })}</div>
        <div className="w-24 px-1">{renderTimePicker({ title: 'After', selected: timeSelector.After })}</div>
      </div>
    </div>
  );
};

export default CalendarTimePicker;
