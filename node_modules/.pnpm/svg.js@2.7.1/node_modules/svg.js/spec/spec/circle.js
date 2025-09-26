describe('Circle', function() {
  var circle
  
  beforeEach(function() {
    circle = draw.circle(240)
  })
  
  afterEach(function() {
    draw.clear()
  })
  
  describe('x()', function() {
    it('returns the value of x without an argument', function() {
      expect(circle.x()).toBe(0)
    })
    it('sets the value of x with the first argument', function() {
      circle.x(123)
      var box = circle.bbox()
      expect(box.x).toBeCloseTo(123)
    })
  })
  
  describe('y()', function() {
    it('returns the value of y without an argument', function() {
      expect(circle.y()).toBe(0)
    })
    it('sets the value of cy with the first argument', function() {
      circle.y(345)
      var box = circle.bbox()
      expect(box.y).toBe(345)
    })
  })
  
  describe('cx()', function() {
    it('returns the value of cx without an argument', function() {
      expect(circle.cx()).toBe(120)
    })
    it('sets the value of cx with the first argument', function() {
      circle.cx(123)
      var box = circle.bbox()
      expect(box.cx).toBe(123)
    })
  })
  
  describe('cy()', function() {
    it('returns the value of cy without an argument', function() {
      expect(circle.cy()).toBe(120)
    })
    it('sets the value of cy with the first argument', function() {
      circle.cy(345)
      var box = circle.bbox()
      expect(box.cy).toBe(345)
    })
  })

  describe('radius()', function() {
    it('sets the r attribute with the first argument', function() {
      circle.radius(10)
      expect(circle.node.getAttribute('r')).toBe('10')
    })
  })

  describe('rx()', function() {
    it('sets the r attribute with the first argument', function() {
      circle.rx(11)
      expect(circle.node.getAttribute('r')).toBe('11')
    })
    it('gets the r attribute without and argument', function() {
      circle.rx()
      expect(circle.node.getAttribute('r')).toBe('120')
    })
  })

  describe('ry()', function() {
    it('sets the r attribute with the first argument', function() {
      circle.ry(12)
      expect(circle.node.getAttribute('r')).toBe('12')
    })
    it('gets the r attribute without and argument', function() {
      circle.ry()
      expect(circle.node.getAttribute('r')).toBe('120')
    })
  })
  
  describe('move()', function() {
    it('sets the x and y position', function() {
      circle.move(123, 456)
      var box = circle.bbox()
      expect(box.x).toBeCloseTo(123)
      expect(box.y).toBe(456)
    })
  })

  describe('dx()', function() {
    it('moves the x positon of the element relative to the current position', function() {
      circle.move(50, 60)
      circle.dx(100)
      expect(circle.node.getAttribute('cx')).toBe('270')
    })
  })

  describe('dy()', function() {
    it('moves the y positon of the element relative to the current position', function() {
      circle.move(50, 60)
      circle.dy(120)
      expect(circle.node.getAttribute('cy')).toBe('300')
    })
  })

  describe('dmove()', function() {
    it('moves the x and y positon of the element relative to the current position', function() {
      circle.move(50,60)
      circle.dmove(80, 25)
      expect(circle.node.getAttribute('cx')).toBe('250')
      expect(circle.node.getAttribute('cy')).toBe('205')
    })
  })
  
  describe('center()', function() {
    it('sets the cx and cy position', function() {
      circle.center(321,567)
      var box = circle.bbox()
      expect(box.cx).toBe(321)
      expect(box.cy).toBe(567)
    })
  })

  describe('width()', function() {
    it('sets the width and height of the element', function() {
      circle.width(82)
      expect(circle.node.getAttribute('r')).toBe('41')
    })
    it('gets the width and height of the element if the argument is null', function() {
      expect((circle.width() / 2).toString()).toBe(circle.node.getAttribute('r'))
    })
  })

  describe('height()', function() {
    it('sets the height and width of the element', function() {
      circle.height(1236)
      expect(circle.node.getAttribute('r')).toBe('618')
    })
    it('gets the height and width of the element if the argument is null', function() {
      expect((circle.height() / 2).toString()).toBe(circle.node.getAttribute('r'))
    })
  })
  
  describe('size()', function() {
    it('defines the r of the element', function() {
      circle.size(987)
      expect(circle.node.getAttribute('r')).toBe((987 / 2).toString())
    })
  })
  
  describe('scale()', function() {
    it('should scale the element universally with one argument', function() {
      var box = circle.scale(2).rbox()
      
      expect(box.width).toBe(circle.attr('r') * 2 * 2)
      expect(box.height).toBe(circle.attr('r') * 2 * 2)
    })
    it('should scale the element over individual x and y axes with two arguments', function() {
      var box = circle.scale(2, 3.5).rbox()
      
      expect(box.width).toBe(circle.attr('r') * 2 * 2)
      expect(box.height).toBe(circle.attr('r') * 2 * 3.5)
    })
  })

  describe('translate()', function() {
    it('sets the translation of an element', function() {
      circle.transform({ x: 12, y: 12 })
      expect(window.matrixStringToArray(circle.node.getAttribute('transform'))).toEqual([1,0,0,1,12,12])
    })
  })
  
})
