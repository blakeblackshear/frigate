var uniqueExec = require('../vendor/unique');
/**
 *
 * @namespace faker.unique
 */
function Unique (faker) {

  // initialize unique module class variables

  // maximum time unique.exec will attempt to run before aborting
  var maxTime = 10;

  // maximum retries unique.exec will recurse before abortings ( max loop depth )
  var maxRetries = 10;

  // time the script started
  // var startTime = 0;

  /**
   * unique
   *
   * @method unique
   */
  this.unique = function unique (method, args, opts) {
    opts = opts || {};
    opts.startTime = new Date().getTime();
    if (typeof opts.maxTime !== 'number') {
      opts.maxTime = maxTime;
    }
    if (typeof opts.maxRetries !== 'number') {
      opts.maxRetries = maxRetries;
    }
    opts.currentIterations = 0;
    return uniqueExec.exec(method, args, opts);
  }
}

module['exports'] = Unique;