SVG.bench.describe('Generate 10000 paths', function(bench) {
  var data = 'M 100 200 C 200 100 300  0 400 100 C 500 200 600 300 700 200 C 800 100 900 100 900 100'

  bench.test('using SVG.js v2.5.3', function() {
    for (var i = 0; i < 10000; i++)
      bench.draw.path(data)
  })
  bench.test('using vanilla js', function() {
    for (var i = 0; i < 10000; i++) {
      var path = document.createElementNS(SVG.ns, 'path')
      path.setAttributeNS(null, 'd', data)
      bench.raw.appendChild(path)
    }
  })
  bench.test('using Snap.svg v0.5.1', function() {
    for (var i = 0; i < 10000; i++)
      bench.snap.path(data)
  })
})