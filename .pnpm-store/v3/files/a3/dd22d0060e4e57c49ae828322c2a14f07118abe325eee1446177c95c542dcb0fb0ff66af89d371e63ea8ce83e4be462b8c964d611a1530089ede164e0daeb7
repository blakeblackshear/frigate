SVG.bench.describe('each() vs forEach()', function(bench) {
  // preparation
  var list = []

  for (var i = 99; i >= 0; i--)
    list.push(bench.draw.rect(100, 50))

  var set = new SVG.Set(list)


  bench.test('10000 x each()', function() {
    for (var i = 0; i < 10000; i++) {
      set.each(function() {
        this.fill('#f06')
      })
    }
  })

  bench.test('10000 x forEach()', function() {
    for (var i = 0; i < 10000; i++) {
      list.forEach(function(e) {
        e.fill('#f06')
      })
    }
  })

})