var defaultAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

function str(length, alphabet) {
  alphabet = alphabet || defaultAlphabet;
  var str = '';
  var alphabetLength = alphabet.length;
  for (var i = 0; i < length; i++) {
    str += alphabet.charAt(Math.floor(Math.random() * alphabetLength));
  }
  return str;
}

exports.str = str;
