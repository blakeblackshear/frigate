SVG.bench.describe('Generate 10000 rects', function(bench) {
  bench.test('using SVG.js v2.5.3', function() {
    for (var i = 0; i < 10000; i++)
      bench.draw.rect(100,100)
  })
  bench.test('using vanilla js', function() {
    for (var i = 0; i < 10000; i++) {
      var rect = document.createElementNS(SVG.ns, 'rect')
      rect.setAttributeNS(null, 'height', 100)
      rect.setAttributeNS(null, 'width', 100)
      bench.raw.appendChild(rect)
    }
  })
  bench.test('using Snap.svg v0.5.1', function() {
    for (var i = 0; i < 10000; i++)
      bench.snap.rect(50, 50, 100, 100)
  })
})


SVG.bench.describe('Generate 10000 rects with fill', function(bench) {
  bench.test('using SVG.js v2.5.3', function() {
    for (var i = 0; i < 10000; i++)
      bench.draw.rect(100,100).fill('#f06')
  })
  bench.test('using vanilla js', function() {
    for (var i = 0; i < 10000; i++) {
      var rect = document.createElementNS(SVG.ns, 'rect')
      rect.setAttributeNS(null, 'height', 100)
      rect.setAttributeNS(null, 'width', 100)
      rect.setAttributeNS(null, 'fill', '#f06')
      bench.raw.appendChild(rect)
    }
  })
  bench.test('using Snap.svg v0.5.1', function() {
    for (var i = 0; i < 10000; i++)
      bench.snap.rect(50, 50, 100, 100).attr('fill', '#f06')
  })
})


SVG.bench.describe('Generate 10000 rects with position and fill', function(bench) {
  bench.test('using SVG.js v2.5.3', function() {
    for (var i = 0; i < 10000; i++)
      bench.draw.rect(100,100).move(50,50).fill('#f06')
  })
  bench.test('using vanilla js', function() {
    for (var i = 0; i < 10000; i++) {
      var rect = document.createElementNS(SVG.ns, 'rect')
      rect.setAttributeNS(null, 'height', 100)
      rect.setAttributeNS(null, 'width', 100)
      rect.setAttributeNS(null, 'fill', '#f06')
      rect.setAttributeNS(null, 'x', 50)
      rect.setAttributeNS(null, 'y', 50)
      bench.raw.appendChild(rect)
    }
  })
  bench.test('using Snap.svg v0.5.1', function() {
    for (var i = 0; i < 10000; i++)
      bench.snap.rect(50, 50, 100, 100).attr('fill', '#f06')
  })
})


SVG.bench.describe('Generate 10000 rects with gradient fill', function(bench) {
  bench.test('using SVG.js v2.5.3', function() {
    for (var i = 0; i < 10000; i++) {
      var g = bench.draw.gradient('linear', function(stop) {
        stop.at(0, '#000')
        stop.at(0.25, '#f00')
        stop.at(1, '#fff')
      })

      bench.draw.rect(100,100).fill(g)
    }
  })
  bench.test('using vanilla js', function() {
    for (var i = 0; i < 10000; i++) {
      var g = document.createElementNS(SVG.ns, 'linearGradient')
      var stop = document.createElementNS(SVG.ns, 'stop')
      stop.setAttributeNS(null, 'offset', '0%')
      stop.setAttributeNS(null, 'color', '#000')
      g.appendChild(stop)
      stop = document.createElementNS(SVG.ns, 'stop')
      stop.setAttributeNS(null, 'offset', '25%')
      stop.setAttributeNS(null, 'color', '#f00')
      g.appendChild(stop)
      stop = document.createElementNS(SVG.ns, 'stop')
      stop.setAttributeNS(null, 'offset', '100%')
      stop.setAttributeNS(null, 'color', '#fff')
      g.appendChild(stop)
      bench.raw.appendChild(g)

      var rect = document.createElementNS(SVG.ns, 'rect')
      rect.setAttributeNS(null, 'height', 100)
      rect.setAttributeNS(null, 'width', 100)
      rect.setAttributeNS(null, 'fill', '#f06')
      bench.raw.appendChild(rect)
    }
  })
  bench.test('using Snap.svg v0.5.1', function() {
    for (var i = 0; i < 10000; i++) {
      var g = bench.snap.gradient("L(0, 0, 100, 100)#000-#f00:25%-#fff")

      bench.snap.rect(50, 50, 100, 100).attr({
        fill: g
      })
    }
  })
})








