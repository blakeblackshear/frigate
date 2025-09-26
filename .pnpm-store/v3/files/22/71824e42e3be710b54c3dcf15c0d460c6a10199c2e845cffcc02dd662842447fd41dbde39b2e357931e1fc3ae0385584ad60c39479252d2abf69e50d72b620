/**
 * constructor userError
 * @constructor
 * @param {*} message errorMessage
 * @param {*} data additional data to be reported
 */
class UserError extends Error {
  constructor(message, data) {
    super(message);
    this.name = 'UserError';
    this.data = data || {};
  }
}

module.exports = UserError;
