/**
 * Turn a list of extnames (*with* dots) into an expression.
 *
 * @param {ReadonlyArray<string>} extnames
 *   List of extnames.
 * @returns {RegExp}
 *   Regex matching them.
 */
export function extnamesToRegex(extnames) {
  return new RegExp(
    '\\.(' +
      extnames
        .map(function (d) {
          return d.slice(1)
        })
        .join('|') +
      ')([?#]|$)'
  )
}
