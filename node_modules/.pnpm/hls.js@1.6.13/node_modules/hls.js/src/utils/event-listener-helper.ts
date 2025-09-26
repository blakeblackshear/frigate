export function addEventListener(
  el: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
) {
  removeEventListener(el, type, listener);
  el.addEventListener(type, listener);
}

export function removeEventListener(
  el: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
) {
  el.removeEventListener(type, listener);
}
