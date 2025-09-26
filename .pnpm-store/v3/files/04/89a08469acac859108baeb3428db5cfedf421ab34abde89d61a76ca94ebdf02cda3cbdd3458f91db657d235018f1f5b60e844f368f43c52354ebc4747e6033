describe('SVG.easing', function() {
  var easedValues = {
    '-':0.5,
    '<>':0.5,
    '>':0.7071,
    '<':0.2929,
  }

  ;['-', '<>', '<', '>'].forEach(function(el) {
    describe(el, function() {
      it('is 0 at 0', function() {
        expect(SVG.easing[el](0)).toBe(0)
      })
      it('is 1 at 1', function() {
        expect(Math.round(SVG.easing[el](1)*1000)/1000).toBe(1) // we need to round cause for some reason at some point 1==0.999999999
      })
      it('is eased at 0.5', function() {
        expect(SVG.easing[el](0.5)).toBeCloseTo(easedValues[el])
      })
    })
  })
})
