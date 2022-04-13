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
    value: 'custom_range',
  },
];

export default function DatePicker({
  helpText,
  keyboardType = 'text',
  inputRef,
  label,
  leadingIcon: LeadingIcon,
  onBlur,
  onChangeText,
  onFocus,
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
  }, [propValue, setValue, value]);

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
          {LeadingIcon ? (
            <div className="w-10 h-full">
              <LeadingIcon />
            </div>
          ) : null}
          <div className="relative w-full">
            <input
              className="h-6 mt-6 w-full bg-transparent focus:outline-none focus:ring-0"
              type={keyboardType}
              readOnly
              onBlur={handleBlur}
              onFocus={handleFocus}
              onInput={handleChange}
              tabIndex="0"
              onClick={onClick}
              value={propValue}
              {...props}
            />
            <div
              className={`absolute top-3 transition transform text-gray-600 dark:text-gray-400 ${
                labelMoved ? 'text-xs -translate-y-2' : ''
              } ${isFocused ? 'text-blue-500 dark:text-blue-500' : ''}`}
            >
              <p>{label}</p>
            </div>
          </div>
          {TrailingIcon ? (
            <div className="w-10 h-10">
              <TrailingIcon />
            </div>
          ) : null}
        </label>
      </div>
      {helpText ? <div className="text-xs pl-3 pt-1">{helpText}</div> : null}
    </div>
  );
}
