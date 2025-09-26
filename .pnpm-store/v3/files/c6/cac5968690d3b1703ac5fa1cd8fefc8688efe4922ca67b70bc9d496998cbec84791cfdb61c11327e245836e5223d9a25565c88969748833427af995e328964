describe('TextPath', function() {
  var text
    , data = 'M 100 200 C 200 100 300  0 400 100 C 500 200 600 300 700 200 C 800 100 900 100 900 100'

  beforeEach(function() {
    text = draw.text('We go up, then we go down, then up again')
  })

  afterEach(function() {
    draw.clear()
  })

  describe('path()', function() {
    it('returns the text element', function() {
      expect(text.path(data)).toBe(text)
    })
    it('creates a textPath node in the text element', function() {
      text.path(data)
      expect(text.node.firstChild.nodeName).toBe('textPath')
    })
  })

  describe('textPath()', function() {
    it('creates a reference to the textPath', function() {
      expect(text.path(data).textPath() instanceof SVG.TextPath).toBe(true)
    })
  })

  describe('track()', function() {
    it('creates a reference to the path', function() {
      expect(text.path(data).track() instanceof SVG.Path).toBe(true)
    })
  })

  describe('array()', function() {
    it('return the path array of the underlying path', function() {
      expect(text.path(data).array()).toEqual(new SVG.PathArray(data))
    })
    it('return null if there is no underlying path', function () {
      expect(text.array()).toBe(null)
    })
  })

  describe('plot()', function() {
    it('change the array of the underlying path when a string is passed', function() {
      expect(text.path().plot(data)).toBe(text)
      expect(text.array()).toEqual(new SVG.PathArray(data))
    })
    it('do nothing when a string is passed and there is no underlying path', function() {
      expect(text.plot(data)).toBe(text)
      expect(text.array()).toEqual(null)
    })
    it('return the path array of the underlying path when no arguments is passed', function () {
      text.path(data)
      expect(text.plot()).toBe(text.array())
      expect(text.plot()).not.toBe(null)
    })
    it('return null when no arguments is passed and there is no underlying path', function () {
      expect(text.plot()).toBe(null)
    })
  })
})
