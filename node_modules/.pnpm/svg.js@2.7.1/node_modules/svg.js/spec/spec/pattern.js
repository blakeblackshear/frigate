describe('Pattern', function() {
  var rect, pattern

  beforeEach(function() {
    rect = draw.rect(100,100)
    pattern = draw.pattern(20, 30, function(add) {
      add.rect(10,10).move(10,10)
      add.circle(30)
    })
  })

  afterEach(function() {
    rect.remove()
    pattern.remove()
  })

  it('is an instance of SVG.Pattern', function() {
    expect(pattern instanceof SVG.Pattern).toBe(true)
  })

  it('allows creation of a new gradient without block', function() {
    pattern = draw.pattern(10,30)
    expect(pattern.children().length).toBe(0)
  })

  describe('fill()', function() {
    it('returns the id of the pattern wrapped in url()', function() {
      expect(pattern.fill()).toBe('url(#' + pattern.attr('id') + ')')
    })
  })

  describe('attr()', function() {
    it('will catch transform attribues and convert them to patternTransform', function() {
      expect(pattern.translate(100,100).attr('patternTransform')).toBe('matrix(1,0,0,1,100,100)')
    })
  })

  describe('toString()', function() {
    it('returns the id of the pattern wrapped in url()', function() {
      expect(pattern + '').toBe('url(#' + pattern.attr('id') + ')')
    })
    it('is called when instance is passed as an attribute value', function() {
      rect.attr('fill', pattern)
      expect(rect.attr('fill')).toBe('url(#' + pattern.attr('id') + ')')
    })
    it('is called when instance is passed in a fill() method', function() {
      rect.fill(pattern)
      expect(rect.attr('fill')).toBe('url(#' + pattern.attr('id') + ')')
    })
  })

  describe('update()', function() {

    it('removes all existing children first', function() {
      pattern = draw.pattern(30, 30, function(add) {
        add.rect(10,10).move(10,10)
        add.circle(30)
      })
      expect(pattern.children().length).toBe(2)
      pattern.update(function(add) {
        add.rect(10,10).move(10,10)
        add.circle(30)
      })
      expect(pattern.children().length).toBe(2)
    })

  })

})
