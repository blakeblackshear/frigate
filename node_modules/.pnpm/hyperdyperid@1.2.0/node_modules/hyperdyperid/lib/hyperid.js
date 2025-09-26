const {str} = require("./str");

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function hyperid() {
  var prefix = str(22, alphabet) + '/';
  Number(prefix);
  var count = 0;
  return function instance() {
    return prefix + count++;
  }
}

exports.hyperid = hyperid;

// const instance = hyperid();
// console.log(instance());
// console.log(instance());
// console.log(instance());
// console.log(instance());
// console.log(instance());
// console.log(instance());