describe('Adopter', function() {
  var path, polyline, polygon, linearGradient, radialGradient

  beforeEach(function() {
    path      = SVG.get('lineAB')
    polyline  = SVG.get('inlineSVG').select('polyline').first()
    polygon   = SVG.get('inlineSVG').select('polygon').first()
    linearGradient   = SVG.get('inlineSVG').select('linearGradient').first()
    radialGradient   = SVG.get('inlineSVG').select('radialGradient').first()
  })

  describe('with SVG.Doc instance', function() {
    it('adopts the main svg document when parent() method is called on first level children', function() {
      expect(path.parent() instanceof SVG.Doc).toBeTruthy()
    })
    it('defines a xmlns attribute', function() {
      expect(path.parent().node.getAttribute('xmlns')).toBe(SVG.ns)
    })
    it('defines a version attribute', function() {
      expect(path.parent().node.getAttribute('version')).toBe('1.1')
    })
    it('defines a xmlns:xlink attribute', function() {
      expect(path.parent().node.getAttribute('xmlns:xlink')).toBe(SVG.xlink)
    })
    it('initializes a defs node', function() {
      expect(path.parent()._defs).toBe(path.parent().defs())
    })
  })

  describe('with SVG.Path instance', function() {
    it('adopts an exiting path element', function() {
      expect(path instanceof SVG.Path).toBeTruthy()
    })
    it('modifies an adopted element', function() {
      path.fill('#f06')
      expect(path.node.getAttribute('fill')).toBe('#ff0066')
    })
    it('parses d attribute to SVG.PathArray', function() {
      expect(path.array() instanceof SVG.PathArray).toBeTruthy()
    })
  })

  describe('with SVG.Polyline instance', function() {
    it('parses points attribute to SVG.PointArray', function() {
      expect(polyline.array() instanceof SVG.PointArray).toBeTruthy()
    })
  })

  describe('with SVG.Polygon instance', function() {
    it('parses points attribute to SVG.PointArray', function() {
      expect(polygon.array() instanceof SVG.PointArray).toBeTruthy()
    })
  })
  
  describe('with linear SVG.Gradient instance', function() {
    it('is instance of SVG.Gradient', function() {
      expect(linearGradient instanceof SVG.Gradient).toBeTruthy()
    })
    it('has type of linear', function() {
      expect(linearGradient.type).toBe('linearGradient') // actually it should be 'linear'. see #606
    })
  })

  describe('with radial SVG.Gradient instance', function() {
    it('is instance of SVG.Gradient', function() {
      expect(radialGradient instanceof SVG.Gradient).toBeTruthy()
    })
    it('has type of radial', function() {
      expect(radialGradient.type).toBe('radialGradient') // actually it should be 'radial'. see #606
    })
  })

  describe('with node that has no matching svg.js class', function() {
    it('wraps the node in the base SVG.Element class', function() {
      var desc = SVG.get('inlineSVG').select('desc').first()
      expect(desc instanceof SVG.Element).toBeTruthy()
    })
  })


})