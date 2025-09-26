describe('Symbol', function() {
  describe('()', function() {
    var element

    beforeEach(function() {
      element = draw.symbol()
    })

    it('creates an instance of SVG.Symbol', function() {
      expect(element instanceof SVG.Symbol).toBeTruthy()
    })
    it('is an instance of SVG.Container', function() {
      expect(element instanceof SVG.Container).toBeTruthy()
    })
  })
})