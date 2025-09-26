describe('Viewbox', function() {
  var viewbox

  beforeEach(function() {
    draw.clear()
  })

  describe('initialization', function() {


    it('creates a new viewbox with default values', function() {
      viewbox = new SVG.ViewBox()

      expect(viewbox.x).toBe(0)
      expect(viewbox.y).toBe(0)
      expect(viewbox.width).toBe(0)
      expect(viewbox.height).toBe(0)
    })



    it('creates a new viewbox from parsed string', function() {
      viewbox = new SVG.ViewBox('10. 100 200 300')

      expect(viewbox.x).toBe(10)
      expect(viewbox.y).toBe(100)
      expect(viewbox.width).toBe(200)
      expect(viewbox.height).toBe(300)
    })



    it('creates a new viewbox from array', function() {
      viewbox = new SVG.ViewBox([10, 100, 200, 300])

      expect(viewbox.x).toBe(10)
      expect(viewbox.y).toBe(100)
      expect(viewbox.width).toBe(200)
      expect(viewbox.height).toBe(300)
    })



    it('creates a new viewbox from object', function() {
      viewbox = new SVG.ViewBox({x:10, y:100, width:200, height:300})

      expect(viewbox.x).toBe(10)
      expect(viewbox.y).toBe(100)
      expect(viewbox.width).toBe(200)
      expect(viewbox.height).toBe(300)
    })



    it('creates a new viewbox from 4 arguments given', function() {
      viewbox = new SVG.ViewBox(10, 100, 200, 300)

      expect(viewbox.x).toBe(10)
      expect(viewbox.y).toBe(100)
      expect(viewbox.width).toBe(200)
      expect(viewbox.height).toBe(300)
    })


    it('creates a new viewbox from parsed string with exponential values', function() {
      viewbox = new SVG.ViewBox('-1.12e1 1e-2 +2e2 +.3e+4')

      expect(viewbox.x).toBe(-11.2)
      expect(viewbox.y).toBe(0.01)
      expect(viewbox.width).toBe(200)
      expect(viewbox.height).toBe(3000)
    })

    it('creates a new viewbox with element given', function() {
      draw.attr('viewBox', '-1.12e1 1e-2 +2e2 +.3e+4')
      viewbox = new SVG.ViewBox(draw)

      expect(viewbox.x).toBe(-11.2)
      expect(viewbox.y).toBe(0.01)
      expect(viewbox.width).toBe(200)
      expect(viewbox.height).toBe(3000)
    })

  })


  describe('viewbox()', function() {

    beforeEach(function() {
      draw.attr('viewBox', null)
    })
    afterEach(function() {
      draw.attr('viewBox', null)
    })

    it('should set the viewbox when four arguments are provided', function() {
      draw.viewbox(0,0,100,100)
      expect(draw.node.getAttribute('viewBox')).toBe('0 0 100 100')
    })
    it('should set the viewbox when an object is provided as first argument', function() {
      draw.viewbox({ x: 0, y: 0, width: 50, height: 50 })
      expect(draw.node.getAttribute('viewBox')).toBe('0 0 50 50')
    })
    it('should set the viewbox when a string is provided as first argument', function() {
      draw.viewbox('0 0 50 50')
      expect(draw.node.getAttribute('viewBox')).toBe('0 0 50 50')
    })
    it('should set the viewbox when an array is provided as first argument', function() {
      draw.viewbox([0, 0, 50, 50])
      expect(draw.node.getAttribute('viewBox')).toBe('0 0 50 50')
    })
    it('should accept negative values', function() {
      draw.size(100,100).viewbox(-100, -100, 50, 50)
      expect(draw.node.getAttribute('viewBox')).toEqual('-100 -100 50 50')
    })
    it('should get the viewbox if no arguments are given', function() {
      draw.viewbox(0, 0, 100, 100)
      expect(draw.viewbox()).toEqual(new SVG.ViewBox(draw))
    })
    it('should define the zoom of the viewbox in relation to the canvas size', function() {
      draw.size(100,100).viewbox(0,0,50,50)
      expect(draw.viewbox().zoom).toEqual(100 / 50)
    })

  })

  describe('morph()', function() {
    it('stores a given viewbox for morphing', function() {
      var viewbox1 = new SVG.ViewBox(10, 100, 200, 300)
        , viewbox2 = new SVG.ViewBox(50, -100, 300, 300)

      viewbox1.morph(viewbox2)

      expect(viewbox1.destination).toEqual(viewbox2)
    })
    it('stores a clone, not the given viewbox itself', function() {
      var viewbox1 = new SVG.ViewBox(10, 100, 200, 300)
        , viewbox2 = new SVG.ViewBox(50, -100, 300, 300)

      viewbox1.morph(viewbox2)

      expect(viewbox1.destination).not.toBe(viewbox2)
    })
  })

  describe('at()', function() {
    it('returns a morphed viewbox at a given position', function() {
      var viewbox1 = new SVG.ViewBox(10, 100, 200, 300)
        , viewbox2 = new SVG.ViewBox(50, -100, 300, 300)
        , viewbox3 = viewbox1.morph(viewbox2).at(0.5)

      expect(viewbox1.toString()).toBe('10 100 200 300')
      expect(viewbox2.toString()).toBe('50 -100 300 300')
      expect(viewbox3.toString()).toBe('30 0 250 300')
    })
    it('returns itself when no destination given', function() {
      var viewbox = new SVG.ViewBox(10, 100, 200, 300)
      expect(viewbox.at(0.5)).toBe(viewbox)
    })
  })

})