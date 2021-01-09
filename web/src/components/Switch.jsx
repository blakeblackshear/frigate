import { h } from 'preact';
import { useCallback, useState } from 'preact/hooks';

export default function Switch({ checked, label, id, onChange }) {
  const handleChange = useCallback(
    (event) => {
      console.log(event.target.checked, !checked);
      onChange(id, !checked);
    },
    [id, onChange, checked]
  );

  return (
    <label for={id} className="flex items-center cursor-pointer">
      <div className="relative">
        <input id={id} type="checkbox" className="hidden" onChange={handleChange} checked={checked} />
        <div className="toggle__line w-12 h-6 bg-gray-400 rounded-full shadow-inner" />
        <div
          className="transition-transform absolute w-6 h-6 bg-white rounded-full shadow-md inset-y-0 left-0"
          style={checked ? 'transform: translateX(100%);' : 'transform: translateX(0%);'}
        />
      </div>
      <div className="ml-3 text-gray-700 font-medium dark:text-gray-200">{label}</div>
    </label>
  );
}
