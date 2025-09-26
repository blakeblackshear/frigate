export {gfmTaskListItemHtml} from './lib/html.js'
export {gfmTaskListItem} from './lib/syntax.js'

/**
 * Augment types.
 */
declare module 'micromark-util-types' {
  /**
   * Token types.
   */
  interface TokenTypeMap {
    taskListCheck: 'taskListCheck'
    taskListCheckMarker: 'taskListCheckMarker'
    taskListCheckValueChecked: 'taskListCheckValueChecked'
    taskListCheckValueUnchecked: 'taskListCheckValueUnchecked'
  }
}
