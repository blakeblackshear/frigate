var shell = require('shelljs'),
  path = require('path'),
  async = require('async'),
  fs = require('fs'),
  exists,
  codegen,
  codegens,
  codegen_path,
  getSubfolders,
  individual_test,
  commandOut;

const args = process.argv[2],
  PATH_TO_CODEGENS_FOLDER = path.resolve(__dirname, '../codegens');

// throw JS error when any shell.js command encounters an error
shell.config.fatal = true;

// ensure that the working tree is clean before packaging
commandOut = shell.exec('source ./npm/package/require_clean_work_tree.sh');
if (commandOut.code !== 0) {
  shell.exit(1);
}

getSubfolders = (folder) => {
  return fs.readdirSync(folder)
    .map((subfolder) => { return { path: path.join(folder, subfolder), name: subfolder}; })
    .filter((obj) => { return fs.statSync(obj.path).isDirectory(); });
};

individual_test = (codegen) => {

  console.log(`Creating package for ${codegen}`);
  async.series([
    function (next) {
      console.log(`Running codegen test for codegen ${codegen}`);
      commandOut = shell.exec(`npm run test ${codegen} --color always`);
      if (commandOut.code !== 0) {
        console.error(`Failed to run codegen test on codegen ${codegen}, here's the error:`);
        return next(commandOut.stderr);
      }
      console.log(commandOut.stdout);
      return next();
    },
    function (next) {
      console.log(`Generating zip for codegen ${codegen}`);
      commandOut = shell.exec(`npm run zip ${codegen} --color always`);
      if (commandOut.code !== 0) {
        console.error(`Failed to zip codegen ${codegen}, here's the error:`);
        return next(commandOut.stderr);
      }
      console.log(commandOut.stdout);
    }
  ], (err) => {
    console.error(err);
    shell.exit(1);
  });
};

if (args) {
  codegen = args;
  codegen_path = path.join(PATH_TO_CODEGENS_FOLDER, codegen);
  try {
    exists = fs.statSync(codegen_path).isDirectory();
  }
  catch (err) {
    console.log(`Codegen ${codegen} doesn't exist, please enter a valid name`);
    console.log(err);
    shell.exit(1);
  }
  if (exists) {
    individual_test(codegen);
  }
}
else {
  console.log('Packaging all the codegens');
  codegens = getSubfolders(PATH_TO_CODEGENS_FOLDER);
  codegens.forEach((codegen) => {
    individual_test(codegen.name);
  });
}
