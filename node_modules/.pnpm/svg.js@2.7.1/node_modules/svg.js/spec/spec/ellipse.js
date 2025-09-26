describe('Ellipse', function() {
  var ellipse
  
  beforeEach(function() {
    ellipse = draw.ellipse(240,90)
  })
  
  afterEach(function() {
    draw.clear()
  })
  
  describe('x()', function() {
    it('returns the value of x without an argument', function() {
      expect(ellipse.x()).toBe(0)
    })
    it('sets the value of x with the first argument', function() {
      ellipse.x(123)
      var box = ellipse.bbox()
      expect(box.x).toBeCloseTo(123)
    })
  })
  
  describe('y()', function() {
    it('returns the value of y without an argument', function() {
      expect(ellipse.y()).toBe(0)
    })
    it('sets the value of cy with the first argument', function() {
      ellipse.y(345)
      var box = ellipse.bbox()
      expect(box.y).toBe(345)
    })
  })
  
  describe('cx()', function() {
    it('returns the value of cx without an argument', function() {
      expect(ellipse.cx()).toBe(120)
    })
    it('sets the value of cx with the first argument', function() {
      ellipse.cx(123)
      var box = ellipse.bbox()
      expect(box.cx).toBe(123)
    })
  })
  
  describe('cy()', function() {
    it('returns the value of cy without an argument', function() {
      expect(ellipse.cy()).toBe(45)
    })
    it('sets the value of cy with the first argument', function() {
      ellipse.cy(345)
      var box = ellipse.bbox()
      expect(box.cy).toBe(345)
    })
  })

  describe('radius()', function() {
    it('sets the rx and ry', function() {
      ellipse.radius(10, 20)
      expect(ellipse.node.getAttribute('rx')).toBe('10')
      expect(ellipse.node.getAttribute('ry')).toBe('20')
    })
    it('sets the rx and ry if only rx given', function() {
      ellipse.radius(30)
      expect(ellipse.node.getAttribute('rx')).toBe('30')
      expect(ellipse.node.getAttribute('ry')).toBe('30')
    })
    it('sets the rx and ry value correctly when given 0', function() {
      ellipse.radius(11, 0)
      expect(ellipse.node.getAttribute('rx')).toBe('11')
      expect(ellipse.node.getAttribute('ry')).toBe('0')
    })
  })
  
  describe('move()', function() {
    it('sets the x and y position', function() {
      ellipse.move(123, 456)
      var box = ellipse.bbox()
      expect(box.x).toBeCloseTo(123)
      expect(box.y).toBeCloseTo(456)
    })
  })

  describe('dx()', function() {
    it('moves the x positon of the element relative to the current position', function() {
      ellipse.move(50, 60)
      ellipse.dx(100)
      expect(ellipse.node.getAttribute('cx')).toBe('270')
    })
  })

  describe('dy()', function() {
    it('moves the y positon of the element relative to the current position', function() {
      ellipse.move(50, 60)
      ellipse.dy(120)
      expect(ellipse.node.getAttribute('cy')).toBe('225')
    })
  })

  describe('dmove()', function() {
    it('moves the x and y positon of the element relative to the current position', function() {
      ellipse.move(50,60)
      ellipse.dmove(80, 25)
      expect(ellipse.node.getAttribute('cx')).toBe('250')
      expect(ellipse.node.getAttribute('cy')).toBe('130')
    })
  })
  
  describe('center()', function() {
    it('sets the cx and cy position', function() {
      ellipse.center(321,567)
      var box = ellipse.bbox()
      expect(box.cx).toBe(321)
      expect(box.cy).toBe(567)
    })
  })

  describe('width()', function() {
    it('sets the width of the element', function() {
      ellipse.width(82)
      expect(ellipse.node.getAttribute('rx')).toBe('41')
    })
    it('gets the width of the element if the argument is null', function() {
      expect((ellipse.width() / 2).toString()).toBe(ellipse.node.getAttribute('rx'))
    })
  })

  describe('height()', function() {
    it('sets the height of the element', function() {
      ellipse.height(1236)
      expect(ellipse.node.getAttribute('ry')).toBe('618')
    })
    it('gets the height of the element if the argument is null', function() {
      expect((ellipse.height() / 2).toString()).toBe(ellipse.node.getAttribute('ry'))
    })
  })
  
  describe('size()', function() {
    it('defines the rx and ry of the element', function() {
      ellipse.size(987,654)
      expect(ellipse.node.getAttribute('rx')).toBe((987 / 2).toString())
      expect(ellipse.node.getAttribute('ry')).toBe((654 / 2).toString())
    })
    it('defines the width and height proportionally with only the width value given', function() {
      var box = ellipse.bbox()
      ellipse.size(500)
      expect(ellipse.width()).toBe(500)
      expect(ellipse.width() / ellipse.height()).toBe(box.width / box.height)
    })
    it('defines the width and height proportionally with only the height value given', function() {
      var box = ellipse.bbox()
      ellipse.size(null, 525)
      expect(ellipse.height()).toBe(525)
      expect(ellipse.width() / ellipse.height()).toBe(box.width / box.height)
    })
  })
  
  describe('scale()', function() {
    it('should scale the element universally with one argument', function() {
      var box = ellipse.scale(2).rbox()
      
      expect(box.width).toBe(ellipse.attr('rx') * 2 * 2)
      expect(box.height).toBe(ellipse.attr('ry') * 2 * 2)
    })
    it('should scale the element over individual x and y axes with two arguments', function() {
      var box = ellipse.scale(2, 3.5).rbox()
      
      expect(box.width).toBe(ellipse.attr('rx') * 2 * 2)
      expect(box.height).toBe(ellipse.attr('ry') * 2 * 3.5)
    })
  })

  describe('translate()', function() {
    it('sets the translation of an element', function() {
      ellipse.transform({ x: 12, y: 12 })
      expect(ellipse.node.getAttribute('transform')).toBe('matrix(1,0,0,1,12,12)')
    })
  })
  
})








