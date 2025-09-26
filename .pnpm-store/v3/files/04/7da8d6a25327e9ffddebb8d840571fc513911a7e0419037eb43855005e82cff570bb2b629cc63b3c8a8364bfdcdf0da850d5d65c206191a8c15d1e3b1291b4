const fs = require('fs');

const fd = fs.openSync(__dirname + '/maps.js', 'w+');

const map1 = {};
for (var i = 0; i < 36; i++) {
  map1[i] = i.toString(36);
}
fs.writeSync(fd, 'exports.map1 = JSON.parse(' + JSON.stringify(JSON.stringify(map1)) + ');\n\n');

const map2 = {};
for (var i = 0; i < 36; i++) {
  for (var j = 0; j < 36; j++) {
    map2[i * 36 + j] = i.toString(36) + j.toString(36);
  }
}
fs.writeSync(fd, 'exports.map2 = JSON.parse(' + JSON.stringify(JSON.stringify(map2)) + ');\n\n');

const map3 = {};
for (var i = 0; i < 36; i++) {
  for (var j = 0; j < 36; j++) {
    for (var k = 0; k < 36; k++) {
      map3[(i * 36 * 36) + (j * 36) + k] = i.toString(36) + j.toString(36) + k.toString(36);
    }
  }
}
fs.writeSync(fd, 'exports.map3 = JSON.parse(' + JSON.stringify(JSON.stringify(map3)) + ');\n\n');
