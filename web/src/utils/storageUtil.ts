export const getUnitSize = (MB: number) => {
  if (MB === null || isNaN(MB) || MB < 0) return "Invalid number";
  if (MB < 1024) return `${MB.toFixed(2)} MiB`;
  if (MB < 1048576) return `${(MB / 1024).toFixed(2)} GiB`;

  return `${(MB / 1048576).toFixed(2)} TiB`;
};
