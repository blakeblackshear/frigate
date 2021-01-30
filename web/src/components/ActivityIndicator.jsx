import { h } from 'preact';

const sizes = {
  sm: 'h-4 w-4 border-2 border-t-2',
  md: 'h-8 w-8 border-4 border-t-4',
  lg: 'h-16 w-16 border-8 border-t-8',
};

export default function ActivityIndicator({ size = 'md' }) {
  return (
    <div className="w-full flex items-center justify-center" aria-label="Loading…">
      <div className={`activityindicator ease-in rounded-full border-gray-200 text-blue-500 ${sizes[size]}`} />
    </div>
  );
}
