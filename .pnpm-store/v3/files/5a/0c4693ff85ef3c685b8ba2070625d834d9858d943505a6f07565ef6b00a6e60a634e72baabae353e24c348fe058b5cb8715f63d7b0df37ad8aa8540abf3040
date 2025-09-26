SVG.bench.describe('read points 10000 times from polygon', function(bench) {
  var poly = bench.draw.polygon('100 100 150 100 175 125 234 512 214 123 451 214 200 200')
  bench.test('with attr', function() {
    var arrs = []
  
    for (var i = 0; i < 100000; i++) {
      arrs.push(poly.array())
      poly.clear()
    }
  })
  bench.test('using dom properties', function() {
    var arrs = []
    
    for (var i = 0; i < 100000; i++)
      arrs.push(new SVG.PointArray(Array.prototype.slice.call(poly.node.points)))
  })
})
