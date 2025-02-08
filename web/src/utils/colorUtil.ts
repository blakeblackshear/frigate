// Utility function to generate colors based on a predefined palette with slight variations
export const generateColors = (numColors: number) => {
  const palette = [
    "#008FFB",
    "#00E396",
    "#FEB019",
    "#FF4560",
    "#775DD0",
    "#3F51B5",
    "#03A9F4",
    "#4CAF50",
    "#F9CE1D",
    "#FF9800",
  ];

  const colors = [...palette]; // Start with the predefined palette

  for (let i = palette.length; i < numColors; i++) {
    const baseColor = palette[i % palette.length];
    // Modify the base color slightly by adjusting the brightness for additional colors
    const factor = 1 + Math.floor(i / palette.length) * 0.1;
    const modifiedColor = adjustColorBrightness(baseColor, factor);
    colors.push(modifiedColor);
  }

  return colors.slice(0, numColors);
};

const adjustColorBrightness = (color: string, factor: number) => {
  const rgb = parseInt(color.slice(1), 16);
  const r = Math.min(255, Math.floor(((rgb >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.floor(((rgb >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((rgb & 0xff) * factor));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
