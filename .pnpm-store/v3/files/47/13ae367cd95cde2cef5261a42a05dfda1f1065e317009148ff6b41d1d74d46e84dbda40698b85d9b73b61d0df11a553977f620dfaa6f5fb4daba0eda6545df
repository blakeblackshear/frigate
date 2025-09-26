const Shell = require('../lib/index');

const ps = new Shell({executionPolicy: 'Bypass', verbose: true, /*version: 3*/});

ps.addCommand('$a = "node-"');
ps.addCommand('$a += "powershell "');
ps.addCommand('$a += "is awesome"; $a')
ps.addCommand('pwd')
ps.invoke()
  .then(output => {
    console.log(output);
    var params = [{name:'str', value:'node-powershell rocks'}];
    ps.addCommand('./script-input.ps1', params);
    return ps.invoke();
  })
  // .then(function(output){
  //   ps.addCommand('throw "error"')
  //   return ps.invoke();
  // })
  .then(function(output){
    console.log(output);
    ps.addCommand('./script-loop.ps1');
    return ps.invoke();
  })
  .then(function(output){
    console.log(output);
    console.log(ps.history);
    ps.dispose();
    process.exit();
  })
  .catch(function(err){
    console.log(err);
    ps.dispose();
    process.exit();
  });