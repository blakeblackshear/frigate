var exec = require('shelljs').exec,
  fs = require('fs'),
  chalk = require('chalk'),
  codegens,
  path = require('path'),
  getSubfolders = (folder) => {
    return fs.readdirSync(folder)
      .map((subfolder) => { return subfolder; });
  };
const args = process.argv,
  BOILERPLATE = path.resolve(__dirname, '../npm/boilerplate'),
  CODEGEN_FOLDER = path.resolve(__dirname, '../codegens') + '/';

codegens = getSubfolders(CODEGEN_FOLDER);

if (!args[2]) {
  console.log(chalk.red('Please provide a name for the codegen.'));
  return;
}

if (codegens.includes(args[2])) {
  console.log(chalk.red('Codegen with the same name already exits. Please choose a unique name.\n'));
  return;
}

exec('cp -a ' + BOILERPLATE + '/. ' + CODEGEN_FOLDER + args[2] + '/'); // cp -a /source/. /destination/

console.log(chalk.yellow('A folder named ' + args[2] +
  ' has been added to /codegens. This folder contains the basic structure of a code-generator.\n'));
