export const longToDate = (long: number): Date => new Date(long * 1000);
export const epochToLong = (date: number): number => date / 1000;
export const dateToLong = (date: Date): number => epochToLong(date.getTime());

const getDateTimeYesterday = (dateTime: Date): Date => {
  const twentyFourHoursInMilliseconds = 24 * 60 * 60 * 1000;
  return new Date(dateTime.getTime() - twentyFourHoursInMilliseconds);
}

const getNowYesterday = (): Date => {
  return getDateTimeYesterday(new Date());
}

export const getNowYesterdayInLong = (): number => {
  return dateToLong(getNowYesterday());
};
