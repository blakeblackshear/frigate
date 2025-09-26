const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const os = require('os');
const shortid = require('shortid');

const PSCommand = require('./PSCommand');

const {
  isWin, isCriticalPSError, logger,
  ShellStreamBuffer, shellSafeWrite,
  convertToPSOption,
} = require('./utils');

const {
  PS_PROC_ERROR,
  PS_ARG_MISS_ERROR,
  PS_ARG_TYPE_ERROR,
  PS_CMD_FAIL_ERROR,
} = require('./errors');

class Shell extends EventEmitter {
  constructor(options = {}) {
    super();

    this.pid = -1;
    this.streams = [];
    this.commands = [];
    this.history = [];
    this.hadErrors = false;
    this.invocationStateInfo = 'NotStarted';
    this.verbose = false;

    let psProc = !isWin ? 'pwsh' : 'powershell';
    let psOpts = ['-NoLogo', '-NoExit', '-Command', '-'];

    if(options.pwsh) {
      psProc = 'pwsh';
    }

    if(options.pwshPrev && !options.pwsh) {
      psProc = 'pwsh-preview';
    }

    if(process.env.NPS) {
      psProc = process.env.NPS;
    }

    if('debugMsg' in options) {
      logger.warn(`debugMsg will be deprecated soon. use verbose instead.
   https://rannn505.gitbook.io/node-powershell/shell/initialize`);
      this.verbose = options.debugMsg;
    }

    if(options.verbose) {
      this.verbose = true;
    }

    // Handle PS process options
    Object.keys(options)
      .filter(k => !['pwsh', 'pwshPrev', 'debugMsg', 'verbose', 'inputEncoding', 'outputEncoding'].includes(k))
      .forEach(k => {
        psOpts = [...convertToPSOption(k, options[k]), ...psOpts];
      });


    const proc = spawn(`${psProc}${!isWin ? '' : '.exe'}`, psOpts, { stdio: 'pipe' });
    this.pid = proc.pid;

    // make sure the PS process start successfully
    if(!this.pid) {
      this.emit('error', new PS_PROC_ERROR());
    }
    proc.once('error', () => {
      this.emit('error', new PS_PROC_ERROR());
    });

    // set streams encoding
    proc.stdin.setDefaultEncoding(options.inputEncoding || 'utf8');
    proc.stdout.setEncoding(options.outputEncoding || 'utf8');
    proc.stderr.setEncoding(options.outputEncoding || 'utf8');

    // handle startup errors
    const psErr = new ShellStreamBuffer();
    proc.stderr.pipe(psErr);

    proc.stdin.on('error', err => {
      if (['ECONNRESET', 'EPIPE'].includes(err.code)) {
        // handle epipe
        setTimeout(() => {
          if(psErr.isEmpty()) {
            this.emit('error', err); // real epipe
          }
        });
        return; // ignore here so proc.once('close') will handle error
      }
      this.emit('error', err); // fallback
    });

    proc.once('close', code => {
      psErr.end();
      this.emit('end', code);
      this.verbose && logger.info(`PS process ${this.pid} exited with code ${code}`);

      if(!psErr.isEmpty() && isCriticalPSError(psErr.getContents())) {
        throw new PS_PROC_ERROR(psErr.getContentsAsString());
      }
    });

    this.invoke = this.invoke.bind(this, proc);
    this.stop = this.stop.bind(this, proc);
    this.dispose = this.dispose.bind(this, proc);

    this.streams = {
      stdin: proc.stdin,
      stdout: proc.stdout,
      stderr: proc.stderr,
    };
  }
  addCommand(command = '', params = []) {
    // PSCommand can throw - so wrapping all in Promise
    return new Promise((resolve) => {
      if(!(command instanceof PSCommand)) {
        command = new PSCommand(command);
      }

      this.commands.push(command);

      if(params && params.length > 0) {
        logger.warn(`params argument for addCommand method will be deprecated soon. use addParameter or addParameters instead.
     https://rannn505.gitbook.io/node-powershell/shell/addCommand`);
        return this.addParameters(params);
      }

      return resolve(this.commands);
    });
  }
  addArgument(argument) {
    return new Promise((resolve, reject) => {
      if(this.commands.length === 0) {
        return reject(new PS_ARG_MISS_ERROR('Commands array is empty. please add at least one command before you use addArgument()'));
      }
      let lastCommand = this.commands.pop();
      lastCommand = lastCommand.addArgument(argument);
      return resolve(this.addCommand(lastCommand));
    });
  }
  addParameter(parameter) {
    return new Promise((resolve, reject) => {
      if(this.commands.length === 0) {
        return reject(new PS_ARG_MISS_ERROR('Commands array is empty. please add at least one command before you use addParameter()'));
      }
      let lastCommand = this.commands.pop();
      lastCommand = lastCommand.addParameter(parameter);
      return resolve(this.addCommand(lastCommand));
    });
  }
  addParameters(parameters = []) {
    return new Promise((resolve, reject) => {
      if(!Array.isArray(parameters)) {
        return reject(new PS_ARG_TYPE_ERROR('Parameters must be an array'));
      }
      if(parameters.length === 0) {
        return reject(new PS_ARG_MISS_ERROR('Parameters are missing'));
      }

      return resolve(Promise.all(parameters.map(this.addParameter, this))
        .then(() => this.commands));
    });
  }
  clear() {
    this.commands = [];
    return Promise.resolve(this.commands);
  }
  invoke() {
    this.invocationStateInfo = 'NotStarted'; // https://docs.microsoft.com/en-us/dotnet/api/system.management.automation.psinvocationstate?view=powershellsdk-1.1.0
    const EOI = `EOI_${shortid.generate()}`;
    const invocationCommands = this.commands.map(psCommand => psCommand.command).join('; ');
    let invocationHadErrors = false;

    const psOut = new ShellStreamBuffer(EOI);
    this.streams.stdout.pipe(psOut);
    this.streams.stderr.pipe(psOut);

    this.streams.stderr.once('data', () => {
      invocationHadErrors = true;
    });

    shellSafeWrite(this.streams.stdin, invocationCommands)
      .then(() => shellSafeWrite(this.streams.stdin, os.EOL))
      .then(() => {
        this.invocationStateInfo = 'Running';
        if(this.verbose) {
          logger.info('Command invoke started');
          logger.debug(invocationCommands);
        }
      })
      // .then(() => shellSafeWrite(this.streams.stdin, `[Console]::Error.Write("${EOI}")`))
      // .then(() => shellSafeWrite(this.streams.stdin, os.EOL))
      .then(() => shellSafeWrite(this.streams.stdin, `[Console]::Out.Write("${EOI}")`))
      .then(() => shellSafeWrite(this.streams.stdin, os.EOL));

    return new Promise((resolve, reject) => {
      psOut.once('EOI', () => {
        this.streams.stdout.unpipe(psOut);
        this.streams.stderr.unpipe(psOut);
        psOut.end();

        const output = psOut.getContentsAsString();
        this.history.push({
          commands: invocationCommands,
          hadErrors: invocationHadErrors,
          results: psOut.getContents(),
        });
        this.commands = [];

        if(invocationHadErrors) {
          this.invocationStateInfo = this.invocationStateInfo !== 'Stopping' ? 'Failed' : 'Stopped';
          this.verbose && logger.error('Command invoke failed');
          this.emit('err', new PS_CMD_FAIL_ERROR(output));
          return reject(new PS_CMD_FAIL_ERROR(output));
        }
        this.invocationStateInfo = this.invocationStateInfo !== 'Stopping' ? 'Completed' : 'Stopped';
        this.verbose && logger.ok('Command invoke completed');
        this.emit('output', output);
        return resolve(output);
      });
    });
  }
  stop(proc) {
    if(this.invocationStateInfo === 'Running') {
      proc.kill(os.constants.signals.SIGABRT);
      this.invocationStateInfo = 'Stopping';
    }
    return Promise.resolve();
  }
  dispose() {
    return shellSafeWrite(this.streams.stdin, 'exit')
      .then(() => shellSafeWrite(this.streams.stdin, os.EOL))
      .then(() => {
        this.streams.stdin.end();
        this.dispose = () => {};
      });
  }
}

module.exports = Shell;
