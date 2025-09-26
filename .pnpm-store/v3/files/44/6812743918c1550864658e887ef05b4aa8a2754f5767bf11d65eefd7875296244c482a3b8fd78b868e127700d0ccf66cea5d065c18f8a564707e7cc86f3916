var shell = require('shelljs'),
  path = require('path'),
  async = require('async'),
  { detect, getNpmVersion } = require('detect-package-manager'),
  pm,
  ver,
  command,
  getSubfolders,
  fs = require('fs'),
  pwd = shell.pwd();
const args = process.argv,
  PATH_TO_CODEGENS_FOLDER = path.resolve(__dirname, '../codegens');

getSubfolders = (folder) => {
  return fs.readdirSync(folder)
    .map((subfolder) => { return { path: path.join(folder, subfolder), name: subfolder}; })
    .filter((obj) => { return fs.statSync(obj.path).isDirectory(); });
};

async.series([
  function (next) {
    detect().then((res) => {
      pm = res;
      console.log('Detected package manager: ' + pm);
      return next();
    });
  },
  function (next) {
    getNpmVersion(pm).then((res) => {
      ver = res;
      console.log('Detected ' + pm + ' version: ' + ver);
      return next();
    });
  },
  function (next) {
    if (args[2] && args[2] === 'dev') {
      console.log('Dev flag detected running ' + pm + ' install');
      command = pm + ' install';
    }
    else {
      switch (pm) {
        case 'yarn':
          if (ver.startsWith('1')) {
            command = 'yarn install --production --frozen-lockfile';
          }
          else {
            command = 'touch yarn.lock && yarn workspaces focus --all --production'
          }
          break;
        case 'pnpm':
          command = 'pnpm install --ignore-workspace --prod';
          break;
        default:
          command = pm + ' install --no-audit --production';
      }
    }

    console.log('Running pre-package script');
    var prepackagePath = path.resolve(__dirname, 'pre-package.js'),
      commandOutput = shell.exec(`node "${prepackagePath}"`);

    if (commandOutput.code !== 0) {
      console.error('Failed while running pre-package.js, here is the error:');
      return next(commandOutput.stderr);
    }
    console.log('Run successful languages.js saved in lib/assets');
    return next();
  },
  function (next) {
    var codegens = getSubfolders(PATH_TO_CODEGENS_FOLDER);
    codegens.forEach((codegen) => {

      shell.cd(codegen.path);

      var commandOut;

      console.log(codegen.name + ': ' + command);
      commandOut = shell.exec(command, { silent: true });

      if (commandOut.code !== 0) {
        console.error('Failed to run ' + pm + ' install on codegen ' + codegen.name + ', here is the error:');
        return next(commandOut.stderr);
      }
      console.log(commandOut.stdout);
    });
  }], (err) => {
  if (err) {
    console.error(err);
  }
  shell.cd(pwd);
});
