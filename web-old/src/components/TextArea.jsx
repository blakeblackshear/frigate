import { h } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

export default function TextArea({
  helpText,
  keyboardType = 'text',
  inputRef,
  onBlur,
  onChangeText,
  onFocus,
  readonly,
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

  useEffect(() => {
    if (propValue !== value) {
      setValue(propValue);
    }
    // DO NOT include `value`
  }, [propValue, setValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full">
      <textarea
        className="block p-2.5 w-full h-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        // className="h-6 mt-6 w-full bg-transparent border-0 focus:outline-none focus:ring-0"
        onBlur={handleBlur}
        onFocus={handleFocus}
        onInput={handleChange}
        readOnly={readonly}
        tabIndex="0"
        {...props}
      >
        {value}
      </textarea>
    </div>
  );
}
