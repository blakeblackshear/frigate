export const isPWA =
  ("standalone" in window.navigator && window.navigator.standalone) ||
  window.matchMedia("(display-mode: standalone)").matches;
