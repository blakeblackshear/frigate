module.exports = {

  getCommandLineHelp: function (command, requiredArgs, optionalArgs) {
    var reqArgs = requiredArgs.reduce(function (res, arg) {return res + ' <' + arg.arg + '>';}, '');
    var output = 'Usage: ' + command + reqArgs + ' [options]\n';
    requiredArgs.forEach(function (argument) {
      output += '  <' + argument.arg + '>' + Array(20 - argument.arg.length).join(' ') + argument.desc + '\n';
    });
    output += '\nOptions:\n';
    optionalArgs.forEach(function (argument) {
      output += '  --' + argument.arg + Array(20 - argument.arg.length).join(' ') + argument.desc + '\n';
    });
    return output;
  },

  mapCommandLineArgs: function (requiredArgs, optionalArgs) {
    var options = {}, r, o, a = 2;
    for (r = 0; r < requiredArgs.length; r += 1) {
      if (a < process.argv.length && process.argv[a].substr(0, 1) !== '-' && process.argv[a] !== 'JASMINE_CONFIG_PATH=./jasmine.json') {
        options[requiredArgs[r].option] = process.argv[a++];
      } else {
        break;
      }
    }
    for (; a < process.argv.length; a += 1) {
      for (o = 0; o < optionalArgs.length; o += 1) {
        if (optionalArgs[o].alias === process.argv[a].slice(1) || optionalArgs[o].arg === process.argv[a].slice(2)) {
          break;
        }
      }
      if (o < optionalArgs.length) {
        switch (optionalArgs[o].type) {
        case 'file': case 'string': case 'number':
          if (a + 1 < process.argv.length) {
            a += 1;
            options[optionalArgs[o].option] = (optionalArgs[o].type === 'number' ? Number(process.argv[a]) : process.argv[a]);
          }
          break;
        case 'flag':
          options[optionalArgs[o].option] = true; break;
        }
      }
    }
    return options;
  }

};
