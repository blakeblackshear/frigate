import { h } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

export default function TextField({
  helpText,
  keyboardType = 'text',
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

  // Reset the state if the prop value changes
  useEffect(() => {
    if (propValue !== value) {
      setValue(propValue);
    }
  }, [propValue, setValue]);

  const labelMoved = isFocused || value !== '';

  return (
    <div className="w-full">
      <div
        className={`bg-gray-100 dark:bg-gray-700 rounded rounded-b-none border-gray-400 border-b p-1 pl-4 pr-3 ${
          isFocused ? 'border-blue-500 dark:border-blue-500' : ''
        }`}
        ref={inputRef}
      >
        <label className="flex space-x-2">
          {LeadingIcon ? <LeadingIcon /> : null}
          <div className="relative w-full">
            <input
              className="h-6 mt-6 w-full bg-transparent focus:outline-none focus:ring-0"
              onBlur={handleBlur}
              onFocus={handleFocus}
              onInput={handleChange}
              readonly={readonly}
              tabindex="0"
              type={keyboardType}
              value={value}
              {...props}
            />
            <div
              className={`absolute top-3 transition transform text-gray-600 dark:text-gray-400 ${
                labelMoved ? 'text-xs -translate-y-2' : ''
              } ${isFocused ? 'text-blue-500 dark:text-blue-500' : ''}`}
            >
              {label}
            </div>
          </div>
          {TrailingIcon ? <TrailingIcon /> : null}
        </label>
      </div>
      {helpText ? <div className="text-xs pl-3 pt-1">{helpText}</div> : null}
    </div>
  );
}
