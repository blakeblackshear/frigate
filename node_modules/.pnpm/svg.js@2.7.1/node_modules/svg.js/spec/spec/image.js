describe('Image', function() {
  var image

  beforeEach(function() {
    image = draw.image(imageUrl, 100, 100)
  })

  afterEach(function() {
    draw.clear()
  })


  describe('()', function() {
    it('should set width and height automatically if no size is given', function(done) {
      image = draw.image(imageUrl).loaded(function() {
        expect(image.node.getAttribute('height')).toBe('1')
        expect(image.node.getAttribute('width')).toBe('1')
        done()
      })
    })
    it('should set width and height if size is given', function(done) {
      image = draw.image(imageUrl, 100, 100).loaded(function() {
        expect(image.node.getAttribute('height')).toBe('100')
        expect(image.node.getAttribute('width')).toBe('100')
        done()
      })
    })
    it('returns itself when no url given', function() {
      var img = new SVG.Image()
      expect(img.load()).toBe(img)
    })
  })

  describe('loaded()', function() {
    beforeEach(function(done) {
      loadCb = {cb: function(){ done() }}
      errorCb = jasmine.createSpy('errorCb')
      spyOn(loadCb, 'cb').and.callThrough()
      image = draw.image(imageUrl, 100, 100).loaded(loadCb.cb).error(errorCb)
    })

    it('should set the load callback', function() {
      expect(image._loaded).toBe(loadCb.cb)
    })
    it('executes the load callback', function() {
      expect(loadCb.cb).toHaveBeenCalledWith({
        width: 1,
        height: 1,
        ratio: 1,
        url: jasmine.any(String)
      })
    })
    it('does not execute the error callback', function() {
      expect(errorCb).not.toHaveBeenCalled()
    })
  })

  describe('error()', function() {
    beforeEach(function(done) {
      loadCb = jasmine.createSpy('loadCb')
      errorCb = {cb: function(){ done() }}
      spyOn(errorCb, 'cb').and.callThrough()
      image = draw.image('not_existant.jpg', 100, 100).loaded(loadCb).error(errorCb.cb)
    })

    it('should set the error callback', function() {
      expect(image._error).toBe(errorCb.cb)
    })
    it('executes the error callback', function() {
      expect(errorCb.cb).toHaveBeenCalledWith(jasmine.any(window.Event))
    })
    it('does not execute the load callback', function() {
      expect(loadCb).not.toHaveBeenCalled()
    })
  })


  describe('x()', function() {
    it('should return the value of x without an argument', function() {
      expect(image.x()).toBe(0)
    })
    it('should set the value of x with the first argument', function() {
      image.x(123)
      var box = image.bbox()
      expect(box.x).toBe(123)
    })
  })

  describe('y()', function() {
    it('should return the value of y without an argument', function() {
      expect(image.y()).toBe(0)
    })
    it('should set the value of y with the first argument', function() {
      image.y(345)
      var box = image.bbox()
      expect(box.y).toBe(345)
    })
  })

  describe('cx()', function() {
    it('should return the value of cx without an argument', function() {
      expect(image.cx()).toBe(50)
    })
    it('should set the value of cx with the first argument', function() {
      image.cx(123)
      var box = image.bbox()
      expect(box.cx).toBe(123)
    })
  })

  describe('cy()', function() {
    it('should return the value of cy without an argument', function() {
      expect(image.cy()).toBe(50)
    })
    it('should set the value of cy with the first argument', function() {
      image.cy(345)
      var box = image.bbox()
      expect(box.cy).toBe(345)
    })
  })

  describe('move()', function() {
    it('should set the x and y position', function() {
      image.move(123,456)
      expect(image.node.getAttribute('x')).toBe('123')
      expect(image.node.getAttribute('y')).toBe('456')
    })
  })

  describe('dx()', function() {
    it('moves the x positon of the element relative to the current position', function() {
      image.move(50,60)
      image.dx(100)
      expect(image.node.getAttribute('x')).toBe('150')
    })
  })

  describe('dy()', function() {
    it('moves the y positon of the element relative to the current position', function() {
      image.move(50,60)
      image.dy(120)
      expect(image.node.getAttribute('y')).toBe('180')
    })
  })

  describe('dmove()', function() {
    it('moves the x and y positon of the element relative to the current position', function() {
      image.move(50,60)
      image.dmove(80, 25)
      expect(image.node.getAttribute('x')).toBe('130')
      expect(image.node.getAttribute('y')).toBe('85')
    })
  })

  describe('center()', function() {
    it('should set the cx and cy position', function() {
      image.center(321,567)
      var box = image.bbox()
      expect(box.cx).toBe(321)
      expect(box.cy).toBe(567)
    })
  })

  describe('width()', function() {
    it('sets the width of the element', function() {
      image.width(789)
      expect(image.node.getAttribute('width')).toBe('789')
    })
    it('gets the width of the element if the argument is null', function() {
      expect(image.width().toString()).toBe(image.node.getAttribute('width'))
    })
  })

  describe('height()', function() {
    it('sets the height of the element', function() {
      image.height(1236)
      expect(image.node.getAttribute('height')).toBe('1236')
    })
    it('gets the height of the element if the argument is null', function() {
      expect(image.height().toString()).toBe(image.node.getAttribute('height'))
    })
  })

  describe('size()', function() {
    it('should define the width and height of the element', function() {
      image.size(987,654)
      expect(image.node.getAttribute('width')).toBe('987')
      expect(image.node.getAttribute('height')).toBe('654')
    })
    it('defines the width and height proportionally with only the width value given', function() {
      var box = image.bbox()
      image.size(500)
      expect(image.width()).toBe(500)
      expect(image.width() / image.height()).toBe(box.width / box.height)
    })
    it('defines the width and height proportionally with only the height value given', function() {
      var box = image.bbox()
      image.size(null, 525)
      expect(image.height()).toBe(525)
      expect(image.width() / image.height()).toBe(box.width / box.height)
    })
  })

  describe('scale()', function() {
    it('should scale the element universally with one argument', function() {
      var box = image.scale(2).rbox()

      expect(box.width).toBe(image.attr('width') * 2)
      expect(box.height).toBe(image.attr('height') * 2)
    })
    it('should scale the element over individual x and y axes with two arguments', function() {
      var box = image.scale(2, 3.5).rbox()

      expect(box.width).toBe(image.attr('width') * 2)
      expect(box.height).toBe(image.attr('height') * 3.5)
    })
  })

  describe('translate()', function() {
    it('should set the translation of an element', function() {
      image.transform({ x: 12, y: 12 })
      expect(image.node.getAttribute('transform')).toBe('matrix(1,0,0,1,12,12)')
    })
  })

})
