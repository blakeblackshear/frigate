import { h } from 'preact';

export function LiveChip({ className }) {
  return (
    <div className={`inline relative px-2 py-1 rounded-full ${className}`}>
      <div className='relative inline-block w-3 h-3 mr-2'>
        <span class='flex h-3 w-3'>
          <span
            class='animate-ping absolute inline-flex h-full w-full rounded-full opacity-75'
            style={{ backgroundColor: 'rgb(74 222 128)' }}
          />
          <span class='relative inline-flex rounded-full h-3 w-3' style={{ backgroundColor: 'rgb(74 222 128)' }}/>
        </span>
      </div>
      <span>Live</span>
    </div>
  );
}
