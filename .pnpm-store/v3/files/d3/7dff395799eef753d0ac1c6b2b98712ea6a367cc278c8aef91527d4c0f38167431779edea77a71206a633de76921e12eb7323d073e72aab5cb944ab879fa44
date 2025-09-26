describe('Use', function() {
  var use

  describe('on a container element', function() {
    var rect

    beforeEach(function() {
      rect = draw.rect(100,100)
      use = draw.use(rect)
    })

    it('creates an instance of SVG.Use', function() {
      expect(use instanceof SVG.Use).toBe(true)
    })

    it('sets the target element id to its href attribute', function() {
      expect(use.node.getAttributeNS(SVG.xlink, 'href')).toBe('#' + rect)
    })

    it('adopts the geometry of the target element', function() {
      expect(use.bbox()).toEqual(rect.bbox())
    })
  })

  describe('on an external path', function() {
    var file = 'http://upload.wikimedia.org/wikipedia/commons/8/84/Example.svg'
      , id = 'flowRoot1882'

    beforeEach(function() {
      use = draw.use(id, file)
    })

    it('creates an instance of SVG.Use', function() {
      expect(use instanceof SVG.Use).toBe(true)
    })

    it('sets the target element id and file path to its href attribute', function() {
      expect(use.node.getAttributeNS(SVG.xlink, 'href')).toBe(file + '#' + id)
    })

  })
  
})