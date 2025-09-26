describe('Polygon', function() {
  var polygon

  beforeEach(function() {
    polygon = draw.polygon('0,0 100,0 100,100 0,100')
  })

  afterEach(function() {
    draw.clear()
  })

  describe('()', function(){
    it('falls back to a single point without an argument', function() {
      polygon = draw.polygon()
      expect(polygon.attr('points')).toBe('0,0')
    })
  })


  describe('array()', function() {
    it('returns an instance of SVG.PointArray', function() {
      expect(polygon.array() instanceof SVG.PointArray).toBeTruthy()
    })
    it('returns the value stored in the private variable _array', function() {
      expect(polygon.array()).toBe(polygon._array)
    })
  })

  describe('x()', function() {
    it('returns the value of x without an argument', function() {
      expect(polygon.x()).toBe(0)
    })
    it('sets the value of x with the first argument', function() {
      polygon.x(123)
      var box = polygon.bbox()
      expect(box.x).toBe(123)
    })
  })

  describe('y()', function() {
    it('returns the value of y without an argument', function() {
      expect(polygon.y()).toBe(0)
    })
    it('sets the value of y with the first argument', function() {
      polygon.y(345)
      var box = polygon.bbox()
      expect(box.y).toBe(345)
    })
  })

  describe('cx()', function() {
    it('returns the value of cx without an argument', function() {
      expect(polygon.cx()).toBe(50)
    })
    it('sets the value of cx with the first argument', function() {
      polygon.cx(123)
      var box = polygon.bbox()
      expect(box.cx).toBe(123)
    })
  })

  describe('cy()', function() {
    it('returns the value of cy without an argument', function() {
      expect(polygon.cy()).toBe(50)
    })
    it('sets the value of cy with the first argument', function() {
      polygon.cy(345)
      var box = polygon.bbox()
      expect(box.cy).toBe(345)
    })
  })

  describe('move()', function() {
    it('sets the x and y position', function() {
      polygon.move(123,456)
      var box = polygon.bbox()
      expect(box.x).toBe(123)
      expect(box.y).toBe(456)
    })
  })

  describe('dx()', function() {
    it('moves the x positon of the element relative to the current position', function() {
      polygon.move(50,60)
      polygon.dx(100)
      var box = polygon.bbox()
      expect(box.x).toBe(150)
    })
  })

  describe('dy()', function() {
    it('moves the y positon of the element relative to the current position', function() {
      polygon.move(50, 60)
      polygon.dy(120)
      var box = polygon.bbox()
      expect(box.y).toBe(180)
    })
  })

  describe('dmove()', function() {
    it('moves the x and y positon of the element relative to the current position', function() {
      polygon.move(50,60)
      polygon.dmove(80, 25)
      var box = polygon.bbox()
      expect(box.x).toBe(130)
      expect(box.y).toBe(85)
    })
  })

  describe('center()', function() {
    it('sets the cx and cy position', function() {
      polygon.center(321,567)
      var box = polygon.bbox()
      expect(box.x).toBe(271)
      expect(box.y).toBe(517)
    })
  })

  describe('width()', function() {
    it('sets the width and height of the element', function() {
      polygon.width(987)
      var box = polygon.bbox()
      expect(box.width).toBeCloseTo(987)
    })
    it('gets the width and height of the element without an argument', function() {
      polygon.width(789)
      expect(polygon.width()).toBeCloseTo(789)
    })
  })

  describe('height()', function() {
    it('sets the height and height of the element', function() {
      polygon.height(987)
      var box = polygon.bbox()
      expect(box.height).toBeCloseTo(987)
    })
    it('gets the height and height of the element without an argument', function() {
      polygon.height(789)
      expect(polygon.height()).toBeCloseTo(789)
    })
  })

  describe('size()', function() {
    it('should define the width and height of the element', function() {
      polygon.size(987,654)
      var box = polygon.bbox()
      expect(box.width).toBeCloseTo(987)
      expect(box.height).toBeCloseTo(654)
    })
    it('defines the width and height proportionally with only the width value given', function() {
      var box = polygon.bbox()
      polygon.size(500)
      expect(polygon.width()).toBe(500)
      expect(polygon.width() / polygon.height()).toBe(box.width / box.height)
    })
    it('defines the width and height proportionally with only the height value given', function() {
      var box = polygon.bbox()
      polygon.size(null, 525)
      expect(polygon.height()).toBe(525)
      expect(polygon.width() / polygon.height()).toBe(box.width / box.height)
    })
  })

  describe('scale()', function() {
    it('should scale the element universally with one argument', function() {
      var box1 = polygon.rbox()
        , box2 = polygon.scale(2).rbox()

      expect(box2.width).toBe(box1.width * 2)
      expect(box2.height).toBe(box1.height * 2)
    })
    it('should scale the element over individual x and y axes with two arguments', function() {
      var box1 = polygon.rbox()
        , box2 = polygon.scale(2, 3.5).rbox()

      expect(box2.width).toBe(box1.width * 2)
      expect(box2.height).toBe(box1.height * 3.5)
    })
  })

  describe('translate()', function() {
    it('sets the translation of an element', function() {
      polygon.transform({ x: 12, y: 12 })
      expect(polygon.node.getAttribute('transform')).toBe('matrix(1,0,0,1,12,12)')
    })
  })

  describe('plot()', function() {
    it('changes the points attribute of the underlying polygon node when a string is passed', function() {
      var pointString = '100,50 75,20 200,100'
        , pointArray = new SVG.PointArray(pointString)

      expect(polygon.plot(pointString)).toBe(polygon)
      expect(polygon.attr('points')).toBe(pointArray.toString())
    })
    it('returns the point array when no arguments are passed', function () {
      expect(polygon.plot()).toBe(polygon.array())
    })
    it('clears the array cache when a value is passed', function() {
      polygon = draw.polygon([100,50,75,20,200,100])
      expect(polygon._array instanceof SVG.PointArray).toBeTruthy()
      polygon.plot('100,50 75,20 200,100')
      expect(polygon._array).toBeUndefined()
    })
    it('applies a given polygon string value as is', function() {
      var polyString = '100,50,75,20,200,100'

      polygon = draw.polygon(polyString)
      expect(polygon.attr('points')).toBe(polyString)
    })
    it('does not parse and cache a given string value to SVG.PointArray', function() {
      polygon = draw.polygon('100,50 75,20 200,100')
      expect(polygon._array).toBeUndefined()
    })
    it('caches a given array value', function() {
      polygon = draw.polygon([100,50,75,20,200,100])
      expect(polygon._array instanceof SVG.PointArray).toBeTruthy()
    })
  })

  describe('clear()', function() {
    it('clears the cached SVG.PointArray instance', function() {
      polygon = draw.polygon([100,50,75,20,200,100])
      polygon.clear()
      expect(polygon._array).toBeUndefined()
    })
  })
})
