SVG.bench.describe('Generate 10000 circles', function(bench) {
  bench.test('using SVG.js v2.5.3', function() {
    for (var i = 0; i < 10000; i++)
      bench.draw.circle(100,100)
  })
  bench.test('using vanilla js', function() {
    for (var i = 0; i < 10000; i++) {
      var circle = document.createElementNS(SVG.ns, 'circle')
      circle.setAttributeNS(null, 'rx', 50)
      circle.setAttributeNS(null, 'ry', 50)
      bench.raw.appendChild(circle)
    }
  })
  bench.test('using Snap.svg v0.5.1', function() {
    for (var i = 0; i < 10000; i++)
      bench.snap.circle(50, 50, 100, 100)
  })
})

SVG.bench.describe('Generate 10000 circles with fill', function(bench) {
  bench.test('using SVG.js v2.5.3', function() {
    for (var i = 0; i < 10000; i++)
      bench.draw.circle(100,100).fill('#f06')
  })
  bench.test('using vanilla js', function() {
    for (var i = 0; i < 10000; i++) {
      var circle = document.createElementNS(SVG.ns, 'circle')
      circle.setAttributeNS(null, 'rx', 50)
      circle.setAttributeNS(null, 'ry', 50)
      circle.setAttributeNS(null, 'fill', '#f06')
      bench.raw.appendChild(circle)
    }
  })
  bench.test('using Snap.svg v0.5.1', function() {
    for (var i = 0; i < 10000; i++)
      bench.snap.circle(50, 50, 100, 100).attr('fill', '#f06')
  })
})