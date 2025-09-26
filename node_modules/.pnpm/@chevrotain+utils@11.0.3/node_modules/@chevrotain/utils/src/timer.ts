export function timer<T>(func: () => T): { time: number; value: T } {
  const start = new Date().getTime();
  const val = func();
  const end = new Date().getTime();
  const total = end - start;
  return { time: total, value: val };
}
