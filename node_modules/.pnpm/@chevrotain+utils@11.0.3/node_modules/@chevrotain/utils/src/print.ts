export function PRINT_ERROR(msg: string) {
  /* istanbul ignore else - can't override global.console in node.js */
  if (console && console.error) {
    console.error(`Error: ${msg}`);
  }
}

export function PRINT_WARNING(msg: string) {
  /* istanbul ignore else - can't override global.console in node.js*/
  if (console && console.warn) {
    // TODO: modify docs accordingly
    console.warn(`Warning: ${msg}`);
  }
}
