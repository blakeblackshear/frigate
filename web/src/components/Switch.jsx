import { h } from 'preact';
import { useCallback, useState } from 'preact/hooks';

export default function Switch({ checked, id, onChange }) {
  const [isFocused, setFocused] = useState(false);

  const handleChange = useCallback(
    (event) => {
      if (onChange) {
        onChange(id, !checked);
      }
    },
    [id, onChange, checked]
  );

  const handleFocus = useCallback(() => {
    onChange && setFocused(true);
  }, [onChange, setFocused]);

  const handleBlur = useCallback(() => {
    onChange && setFocused(false);
  }, [onChange, setFocused]);

  return (
    <label
      htmlFor={id}
      className={`flex items-center justify-center ${onChange ? 'cursor-pointer' : 'cursor-not-allowed'}`}
    >
      <div
        onMouseOver={handleFocus}
        onMouseOut={handleBlur}
        className={`w-8 h-5 relative ${!onChange ? 'opacity-60' : ''}`}
      >
        <div className="relative overflow-hidden">
          <input
            className="absolute left-48"
            onBlur={handleBlur}
            onFocus={handleFocus}
            tabIndex="0"
            id={id}
            type="checkbox"
            onChange={handleChange}
            checked={checked}
          />
        </div>
        <div
          className={`w-8 h-3 absolute top-1 left-1 ${
            !checked ? 'bg-gray-300' : 'bg-blue-300'
          } rounded-full shadow-inner`}
        />
        <div
          className={`transition-all absolute w-5 h-5 rounded-full shadow-md inset-y-0 left-0  ring-opacity-30 ${
            isFocused ? 'ring-4 ring-gray-500' : ''
          } ${checked ? 'bg-blue-600' : 'bg-white'} ${isFocused && checked ? 'ring-blue-500' : ''}`}
          style={checked ? 'transform: translateX(100%);' : 'transform: translateX(0%);'}
        />
      </div>
    </label>
  );
}
