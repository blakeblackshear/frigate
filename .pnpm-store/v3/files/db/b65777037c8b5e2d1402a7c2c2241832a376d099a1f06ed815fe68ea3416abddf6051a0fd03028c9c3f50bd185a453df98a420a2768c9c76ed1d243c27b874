describe('Polyline', function() {
  var polyline

  beforeEach(function() {
    polyline = draw.polyline('0,0 100,0 100,100 0,100')
  })

  afterEach(function() {
    draw.clear()
  })

  describe('()', function(){
    it('falls back to a single point without an argument', function() {
      polyline = draw.polyline()
      expect(polyline.attr('points')).toBe('0,0')
    })
  })


  describe('array()', function() {
    it('returns an instance of SVG.PointArray', function() {
      expect(polyline.array() instanceof SVG.PointArray).toBeTruthy()
    })
    it('returns the value stored in the private variable _array', function() {
      expect(polyline.array()).toBe(polyline._array)
    })
  })

  describe('x()', function() {
    it('returns the value of x without an argument', function() {
      expect(polyline.x()).toBe(0)
    })
    it('sets the value of x with the first argument', function() {
      polyline.x(123)
      var box = polyline.bbox()
      expect(box.x).toBe(123)
    })
  })

  describe('y()', function() {
    it('returns the value of y without an argument', function() {
      expect(polyline.y()).toBe(0)
    })
    it('sets the value of y with the first argument', function() {
      polyline.y(345)
      var box = polyline.bbox()
      expect(box.y).toBe(345)
    })
  })

  describe('cx()', function() {
    it('returns the value of cx without an argument', function() {
      expect(polyline.cx()).toBe(50)
    })
    it('sets the value of cx with the first argument', function() {
      polyline.cx(123)
      var box = polyline.bbox()
      expect(box.cx).toBe(123)
    })
  })

  describe('cy()', function() {
    it('returns the value of cy without an argument', function() {
      expect(polyline.cy()).toBe(50)
    })
    it('sets the value of cy with the first argument', function() {
      polyline.cy(345)
      var box = polyline.bbox()
      expect(box.cy).toBe(345)
    })
  })

  describe('move()', function() {
    it('sets the x and y position', function() {
      polyline.move(123,456)
      var box = polyline.bbox()
      expect(box.x).toBe(123)
      expect(box.y).toBe(456)
    })
  })

  describe('dx()', function() {
    it('moves the x positon of the element relative to the current position', function() {
      polyline.move(50,60)
      polyline.dx(100)
      var box = polyline.bbox()
      expect(box.x).toBe(150)
    })
  })

  describe('dy()', function() {
    it('moves the y positon of the element relative to the current position', function() {
      polyline.move(50, 60)
      polyline.dy(120)
      var box = polyline.bbox()
      expect(box.y).toBe(180)
    })
  })

  describe('dmove()', function() {
    it('moves the x and y positon of the element relative to the current position', function() {
      polyline.move(50,60)
      polyline.dmove(80, 25)
      var box = polyline.bbox()
      expect(box.x).toBe(130)
      expect(box.y).toBe(85)
    })
  })

  describe('center()', function() {
    it('sets the cx and cy position', function() {
      polyline.center(321,567)
      var box = polyline.bbox()
      expect(box.x).toBe(271)
      expect(box.y).toBe(517)
    })
  })

  describe('width()', function() {
    it('sets the width and height of the element', function() {
      polyline.width(987)
      var box = polyline.bbox()
      expect(box.width).toBeCloseTo(987, 1)
    })
    it('gets the width and height of the element without an argument', function() {
      polyline.width(789)
      expect(polyline.width()).toBeCloseTo(789)
    })
  })

  describe('height()', function() {
    it('sets the height and height of the element', function() {
      polyline.height(987)
      var box = polyline.bbox()
      expect(box.height).toBeCloseTo(987)
    })
    it('gets the height and height of the element without an argument', function() {
      polyline.height(789)
      expect(polyline.height()).toBeCloseTo(789)
    })
  })

  describe('size()', function() {
    it('should define the width and height of the element', function() {
      polyline.size(987,654)
      var box = polyline.bbox()
      expect(box.width).toBeCloseTo(987)
      expect(box.height).toBeCloseTo(654)
    })
    it('defines the width and height proportionally with only the width value given', function() {
      var box = polyline.bbox()
      polyline.size(500)
      expect(polyline.width()).toBe(500)
      expect(polyline.width() / polyline.height()).toBe(box.width / box.height)
    })
    it('defines the width and height proportionally with only the height value given', function() {
      var box = polyline.bbox()
      polyline.size(null, 525)
      expect(polyline.height()).toBe(525)
      expect(polyline.width() / polyline.height()).toBe(box.width / box.height)
    })
  })

  describe('scale()', function() {
    it('should scale the element universally with one argument', function() {
      var box1 = polyline.rbox()
        , box2 = polyline.scale(2).rbox()

      expect(box2.width).toBe(box1.width * 2)
      expect(box2.height).toBe(box1.height * 2)
    })
    it('should scale the element over individual x and y axes with two arguments', function() {
      var box1 = polyline.rbox()
        , box2 = polyline.scale(2, 3.5).rbox()

      expect(box2.width).toBe(box1.width * 2)
      expect(box2.height).toBe(box1.height * 3.5)
    })
  })

  describe('translate()', function() {
    it('sets the translation of an element', function() {
      polyline.transform({ x: 12, y: 12 })
      expect(polyline.node.getAttribute('transform')).toBe('matrix(1,0,0,1,12,12)')
    })
  })

  describe('plot()', function() {
    it('change the points attribute of the underlying polyline node when a string is passed', function() {
      var pointString = '100,50 75,20 200,100'
        , pointArray = new SVG.PointArray(pointString)

      expect(polyline.plot(pointString)).toBe(polyline)
      expect(polyline.attr('points')).toBe(pointArray.toString())
    })
    it('return the point array when no arguments are passed', function () {
      expect(polyline.plot()).toBe(polyline.array())
    })
    it('clears the array cache when a value is passed', function() {
      polyline = draw.polyline([100,50,75,20,200,100])
      expect(polyline._array instanceof SVG.PointArray).toBeTruthy()
      polyline.plot('100,50 75,20 200,100')
      expect(polyline._array).toBeUndefined()
    })
    it('applies a given polyline string value as is', function() {
      var polyString = '100,50,75,20,200,100'

      polyline = draw.polyline(polyString)
      expect(polyline.attr('points')).toBe(polyString)
    })
    it('does not parse and cache a given string value to SVG.PointArray', function() {
      polyline = draw.polyline('100,50 75,20 200,100')
      expect(polyline._array).toBeUndefined()
    })
    it('caches a given array value', function() {
      polyline = draw.polyline([100,50,75,20,200,100])
      expect(polyline._array instanceof SVG.PointArray).toBeTruthy()
    })
  })

  describe('clear()', function() {
    it('clears the cached SVG.PointArray instance', function() {
      polyline = draw.polyline([100,50,75,20,200,100])
      polyline.clear()
      expect(polyline._array).toBeUndefined()
    })
  })
})
