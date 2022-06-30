import { useState } from 'preact/hooks';

const hours = ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "24:00"]

export default function TimePicker({ onChange, timeRange }) {
  const [state, setState] = useState({
    after: timeRange["after"] ?? "24:00",
    before: timeRange["before"] ?? "00:00",
  });

  const onTimeSelect = (newAfter, newBefore) => {
    setState({ after: newAfter, before: newBefore });

    if (onChange) {
      onChange(`${newAfter},${newBefore}`);
    }
  };

  return (
    <div className="w-full flex justify-start flex-shrink m-1">
      <div className="m-1">
        <div className="text-center font-semibold p-2">After:</div>
        <select
          className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
          value={state.after}
          onChange={(e) => onTimeSelect(e.target.value, state.before)}
        >
          {hours.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="m-1">
        <div className="text-center font-semibold p-2">Before:</div>
        <select
          className="basis-1/2 cursor-pointer rounded dark:bg-slate-800"
          value={state.before}
          onChange={(e) => onTimeSelect(state.after, e.target.value)}
        >
          {hours.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

