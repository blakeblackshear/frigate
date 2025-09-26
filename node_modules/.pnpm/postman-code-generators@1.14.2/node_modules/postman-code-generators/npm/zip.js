var shell = require('shelljs'),
  path = require('path'),
  fs = require('fs'),
  codegen_path,
  commandOut,
  exists;

const codegen = process.argv[2],
  PATH_TO_CODEGENS_FOLDER = path.resolve(__dirname, '../codegens');

// throw JS error when any shell.js command encounters an error
shell.config.fatal = true;

codegen_path = path.join(PATH_TO_CODEGENS_FOLDER, codegen);

try {
  exists = fs.statSync(codegen_path).isDirectory();
}
catch (err) {
  console.log(`Codegen ${codegen} doesn't exist, please enter a valid name`);
  shell.exit(1);
}
if (exists) {
  console.log(`${codegen} : zip`);
  shell.pushd(codegen_path, 'q');
  commandOut = shell.exec('npm pack --color always');
  if (commandOut.code !== 0) {
    console.error(`Failed to run pre-package.js for codegen ${codegen}, here's the error:`);
    console.log(commandOut.stderr);
    shell.exit(1);
  }
  shell.popd(null, 'q');
}
