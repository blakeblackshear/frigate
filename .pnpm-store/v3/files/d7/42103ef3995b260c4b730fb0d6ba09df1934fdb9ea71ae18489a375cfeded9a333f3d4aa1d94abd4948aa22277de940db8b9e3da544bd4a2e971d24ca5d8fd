describe('Rect', function() {
  var rect
  
  beforeEach(function() {
    rect = draw.rect(220,100)
  })
  
  afterEach(function() {
    draw.clear()
  })
  
  describe('x()', function() {
    it('should return the value of x without an argument', function() {
      expect(rect.x()).toBe(0)
    })
    it('should set the value of x with the first argument', function() {
      rect.x(123)
      expect(rect.node.getAttribute('x')).toBe('123')
    })
  })
  
  describe('y()', function() {
    it('should return the value of y without an argument', function() {
      expect(rect.y()).toBe(0)
    })
    it('should set the value of y with the first argument', function() {
      rect.y(345)
      expect(rect.node.getAttribute('y')).toBe('345')
    })
  })
  
  describe('cx()', function() {
    it('should return the value of cx without an argument', function() {
      expect(rect.cx()).toBe(110)
    })
    it('should set the value of cx with the first argument', function() {
      rect.cx(123)
      var box = rect.bbox()
      expect(box.cx).toBe(123)
    })
  })
  
  describe('cy()', function() {
    it('should return the value of cy without an argument', function() {
      expect(rect.cy()).toBe(50)
    })
    it('should set the value of cy with the first argument', function() {
      rect.cy(345)
      var box = rect.bbox()
      expect(box.cy).toBe(345)
    })
  })

  describe('radius()', function() {
    it('should set the rx and ry', function() {
      rect.radius(10,20)
      expect(rect.node.getAttribute('rx')).toBe('10')
      expect(rect.node.getAttribute('ry')).toBe('20')
    })
    it('should set the rx and ry if only rx given', function() {
      rect.radius(30)
      expect(rect.node.getAttribute('rx')).toBe('30')
      expect(rect.node.getAttribute('ry')).toBe('30')
    })
  })
  
  describe('move()', function() {
    it('should set the x and y position', function() {
      rect.move(123,456)
      expect(rect.node.getAttribute('x')).toBe('123')
      expect(rect.node.getAttribute('y')).toBe('456')
    })
  })

  describe('dx()', function() {
    it('moves the x positon of the element relative to the current position', function() {
      rect.move(50,60)
      rect.dx(100)
      expect(rect.node.getAttribute('x')).toBe('150')
    })
  })

  describe('dy()', function() {
    it('moves the y positon of the element relative to the current position', function() {
      rect.move(50,60)
      rect.dy(120)
      expect(rect.node.getAttribute('y')).toBe('180')
    })
  })

  describe('dmove()', function() {
    it('moves the x and y positon of the element relative to the current position', function() {
      rect.move(50,60)
      rect.dmove(80, 25)
      expect(rect.node.getAttribute('x')).toBe('130')
      expect(rect.node.getAttribute('y')).toBe('85')
    })
  })
  
  describe('center()', function() {
    it('should set the cx and cy position', function() {
      rect.center(321,567)
      var box = rect.bbox()
      expect(box.cx).toBe(321)
      expect(box.cy).toBe(567)
    })
  })
  
  describe('width()', function() {
    it('sets the width of the element', function() {
      rect.width(789)
      expect(rect.node.getAttribute('width')).toBe('789')
    })
    it('gets the width of the element if the argument is null', function() {
      expect(rect.width().toString()).toBe(rect.node.getAttribute('width'))
    })
  })

  describe('height()', function() {
    it('sets the height of the element', function() {
      rect.height(1236)
      expect(rect.node.getAttribute('height')).toBe('1236')
    })
    it('gets the height of the element if the argument is null', function() {
      expect(rect.height().toString()).toBe(rect.node.getAttribute('height'))
    })
  })

  describe('size()', function() {
    it('should define the width and height of the element', function() {
      rect.size(987,654)
      expect(rect.node.getAttribute('width')).toBe('987')
      expect(rect.node.getAttribute('height')).toBe('654')
    })
    it('defines the width and height proportionally with only the width value given', function() {
      var box = rect.bbox()
      rect.size(500)
      expect(rect.width()).toBe(500)
      expect(rect.width() / rect.height()).toBe(box.width / box.height)
    })
    it('defines the width and height proportionally with only the height value given', function() {
      var box = rect.bbox()
      rect.size(null, 525)
      expect(rect.height()).toBe(525)
      expect(rect.width() / rect.height()).toBe(box.width / box.height)
    })
  })
  
  describe('scale()', function() {
    it('should scale the element universally with one argument', function() {
      var box = rect.scale(2).rbox()
      
      expect(box.width).toBe(rect.attr('width') * 2)
      expect(box.height).toBe(rect.attr('height') * 2)
    })
    it('should scale the element over individual x and y axes with two arguments', function() {
      var box = rect.scale(2, 3.5).rbox()
      
      expect(box.width).toBe(rect.attr('width') * 2)
      expect(box.height).toBe(rect.attr('height') * 3.5)
    })
  })

  describe('translate()', function() {
    it('should set the translation of an element', function() {
      rect.transform({ x: 12, y: 12 })
      expect(rect.node.getAttribute('transform')).toBe('matrix(1,0,0,1,12,12)')
    })
  })
  
})








