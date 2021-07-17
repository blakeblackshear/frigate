import { h } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

export const DateFilterOptions = [
  {
    label: 'All',
    value: ['all'],
  },
  {
    label: 'Today',
    value: {
      //Before
      before: new Date().setHours(24, 0, 0, 0) / 1000,
      //After
      after: new Date().setHours(0, 0, 0, 0) / 1000,
    },
  },
  {
    label: 'Yesterday',
    value: {
      //Before
      before: new Date(new Date().setDate(new Date().getDate() - 1)).setHours(24, 0, 0, 0) / 1000,
      //After
      after: new Date(new Date().setDate(new Date().getDate() - 1)).setHours(0, 0, 0, 0) / 1000,
    },
  },
  {
    label: 'Last 7 Days',
    value: {
      //Before
      before: new Date().setHours(24, 0, 0, 0) / 1000,
      //After
      after: new Date(new Date().setDate(new Date().getDate() - 7)).setHours(0, 0, 0, 0) / 1000,
    },
  },
  {
    label: 'This Month',
    value: {
      //Before
      before: new Date().setHours(24, 0, 0, 0) / 1000,
      //After
      after: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000,
    },
  },
  {
    label: 'Last Month',
    value: {
      //Before
      before: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000,
      //After
      after: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime() / 1000,
    },
  },
  {
    label: 'Custom Range',
    value: null,
  },
];

export default function DatePicker({
  helpText,
  keyboardType = 'date',
  inputRef,
  label,
  leadingIcon: LeadingIcon,
  onBlur,
  onChangeText,
  onFocus,
  readonly,
  trailingIcon: TrailingIcon,
  value: propValue = '',
  ...props
}) {
  const [isFocused, setFocused] = useState(false);
  const [value, setValue] = useState(propValue);

  useEffect(() => {
    if (propValue !== value) {
      setValue(propValue);
    }
    // DO NOT include `value`
  }, [propValue, setValue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDateToInput(value);
  }, []);

  const handleFocus = useCallback(
    (event) => {
      setFocused(true);
      onFocus && onFocus(event);
    },
    [onFocus]
  );

  const handleBlur = useCallback(
    (event) => {
      setFocused(false);
      onBlur && onBlur(event);
    },
    [onBlur]
  );

  const handleChange = useCallback(
    (event) => {
      const { value } = event.target;
      setValue(value);
      onChangeText && onChangeText(value);
    },
    [onChangeText, setValue]
  );

  const getDateFromDateString = (dateValue) => {
    const dateData = dateValue.split('-').map((d) => parseInt(d, 10));
    if (dateData.length < 3) return null;

    const year = dateData[0];
    const month = dateData[1];
    const date = dateData[2];
    return { year, month, date };
  };

  const getDateStringFromTimestamp = (timestamp) => {
    const dateObject = new Date(timestamp * 1000);
    const month = dateObject.getMonth() + 1;
    const date = dateObject.getDate();
    return dateObject.getFullYear() + '-' + (month < 10 ? '0' + month : month) + '-' + (date < 10 ? '0' + date : date);
  };

  const setDateClick = (dateData) => {
    const selectedDay = new Date(dateData.year, dateData.month - 1, dateData.date).getTime();
    if (props.onchange) {
      props.onchange(new Date(selectedDay).getTime() / 1000);
    }
  };

  const setDateToInput = (timestamp) => {
    const dateString = getDateStringFromTimestamp(timestamp);
    // inputRef.current.value = dateString;
  };
  const onClick = (e) => {
    props.onclick(e);
  };
  const labelMoved = isFocused || value !== '';

  return (
    <div className="w-full">
      {props.children}
      <div
        className={`bg-gray-100 dark:bg-gray-700 rounded rounded-b-none border-gray-400 border-b p-1 pl-4 pr-3 ${
          isFocused ? 'border-blue-500 dark:border-blue-500' : ''
        }`}
        ref={inputRef}
      >
        <label
          className="flex space-x-2 items-center"
          data-testid={`label-${label.toLowerCase().replace(/[^\w]+/g, '_')}`}
        >
          <div className="relative w-full">
            <input
              className="h-6 mt-6 w-full bg-transparent focus:outline-none focus:ring-0"
              type="text"
              readOnly
              onBlur={handleBlur}
              onFocus={handleFocus}
              onInput={handleChange}
              tabIndex="0"
              onClick={onClick}
              value={propValue}
            />
            <div
              className={`absolute top-3 transition transform text-gray-600 dark:text-gray-400 ${
                labelMoved ? 'text-xs -translate-y-2' : ''
              } ${isFocused ? 'text-blue-500 dark:text-blue-500' : ''}`}
            >
              <p>{label}</p>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
