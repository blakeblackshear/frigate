import { useEffect, useRef } from 'preact/hooks';

// https://stackoverflow.com/a/54292872/2693528
export const useClickOutside = (callback) => {
  const callbackRef = useRef(); // initialize mutable ref, which stores callback
  const innerRef = useRef(); // returned to client, who marks "border" element

  // update cb on each render, so second useEffect has access to current value
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
    function handleClick(e) {
      if (innerRef.current && callbackRef.current && !innerRef.current.contains(e.target)) callbackRef.current(e);
    }
  }, []);

  return innerRef; // convenience for client (doesn't need to init ref himself)
};
