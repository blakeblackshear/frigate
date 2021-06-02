import { h } from 'preact';
import { useState } from 'preact/hooks';
import ArrowDropdown from '../icons/ArrowDropdown';
import ArrowDropup from '../icons/ArrowDropup';

export default function Accordion({ title, children, selected = false }) {
  const [active, setActive] = useState(selected);
  const toggle = () => setActive(!active);
  return (
    <div className="w-full border border-white border-opacity-20 rounded-md mb-4 text-xs">
      <div className="relative w-full cursor-pointer md:text-lg" onClick={toggle}>
        <div className="w-90 py-1 px-2 text-center font-bold">{title}</div>
        <div className="absolute top-0 md:-top-1 right-0 md:right-2 w-6 md:w-10 h-6 md:h-10">
          {active ? <ArrowDropup /> : <ArrowDropdown />}
        </div>
      </div>
      <div className={`bg-white bg-opacity-20 rounded-b-md p-2 ${active ? '' : 'hidden'}`}>{children}</div>
    </div>
  );
}
