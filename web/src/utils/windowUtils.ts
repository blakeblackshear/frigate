export const convertRemToPixels = (rem: number): number => {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}
