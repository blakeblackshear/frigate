const colors = require('chalk');

class BaseError extends Error {
  constructor(message) {
    message = `
      ${colors.red(message)}`;
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
  }
}

class PS_PROC_ERROR extends BaseError {
  constructor(message = `
      Node-PowerShell was unable to start PowerShell.
      Please make sure that PowerShell is installed properly on your system, and try again.
      https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell`) {
    super(message);
  }
}

class PS_ARG_MISS_ERROR extends BaseError { }

class PS_ARG_TYPE_ERROR extends BaseError { }

class PS_CMD_FAIL_ERROR extends BaseError { }

module.exports = {
  PS_PROC_ERROR,
  PS_ARG_MISS_ERROR,
  PS_ARG_TYPE_ERROR,
  PS_CMD_FAIL_ERROR,
};
