import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ArrowDropdown } from '../icons/ArrowDropdown';
import { ArrowDropup } from '../icons/ArrowDropup';
import Heading from './Heading';

const TimePicker = ({ timeRange, onChange }) => {
  const times = timeRange.split(',');
  const [after, setAfter] = useState(times[0]);
  const [before, setBefore] = useState(times[1]);

  // Create repeating array with the number of hours for 1 day ...23,24,0,1,2...
  const hoursInDays = Array.from({ length: 24 }, (_, i) => String(i % 24).padStart(2, '0'));

  // background colors for each day
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

  const isSelected = (idx, current) => {
    return current == `${idx}:00`;
  };

  const isSelectedCss = 'bg-blue-600 transition duration-300 ease-in-out hover:rounded-none';
  const handleTime = (after, before) => {
    setAfter(after);
    setBefore(before);
    onChange(`${after},${before}`);
  };

  return (
    <>
      <div className="mt-2 pr-3 hidden xs:block" aria-label="Calendar timepicker, select a time range">
        <div className="flex items-center justify-center">
          <ArrowDropup className="w-10 text-center" />
        </div>
        <div className="px-1 flex justify-between">
          <div>
            <Heading className="text-center" size="sm">
              After
            </Heading>
            <div
              className="w-20 border border-gray-400/50 cursor-pointer hide-scroll shadow-md rounded-md"
              style={{ maxHeight: '17rem', overflowY: 'scroll' }}
            >
              {hoursInDays.map((time, idx) => (
                <div className={`${isSelected(time, after) ? isSelectedCss : ''}`} key={idx} id={`timeIndex-${idx}`}>
                  <div
                    className={`
            text-gray-300 w-full font-light border border-transparent hover:border hover:rounded-md hover:border-gray-600 text-center text-sm
            ${randomGrayTone([Math.floor(idx / 24)])}`}
                    onClick={() => handleTime(`${time}:00`, before)}
                  >
                    <span aria-label={`${idx}:00`}>{hoursInDays[idx]}:00</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Heading className="text-center" size="sm">
              Before
            </Heading>
            <div
              className="w-20 border border-gray-400/50 cursor-pointer hide-scroll shadow-md rounded-md"
              style={{ maxHeight: '17rem', overflowY: 'scroll' }}
            >
              {hoursInDays.map((time, idx) => (
                <div className={`${isSelected(time, before) ? isSelectedCss : ''}`} key={idx} id={`timeIndex-${idx}`}>
                  <div
                    className={`
            text-gray-300 w-full font-light border border-transparent hover:border hover:rounded-md hover:border-gray-600 text-center text-sm
            ${randomGrayTone([Math.floor(idx / 24)])}`}
                    onClick={() => handleTime(after, `${time}:00`)}
                  >
                    <span aria-label={`${idx}:00`}>{hoursInDays[idx]}:00</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <ArrowDropdown className="w-10 text-center" />
        </div>
      </div>
    </>
  );
};

export default TimePicker;
