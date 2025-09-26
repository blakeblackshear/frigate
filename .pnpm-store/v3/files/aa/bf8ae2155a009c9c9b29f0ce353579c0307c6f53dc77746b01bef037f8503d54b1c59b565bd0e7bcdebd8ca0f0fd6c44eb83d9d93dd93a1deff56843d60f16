describe('Memory', function () {
  var rect, circle

  beforeEach(function() {
    rect = draw.rect(100,120)
    circle = draw.circle(100)
  })

  afterEach(function() {
    draw.clear()
  })

  describe('remember()', function() {
    it('accepts an object with values', function() {
      rect.remember({ some: {cool:'and',nested:'stuff',foo:5} })
      expect(rect.remember('some').foo).toBe(5)
    })
    it('accepts key / value arguments', function() {
      rect.remember('fill', rect.attr('fill'))
      rect.fill('#f09')
      expect(rect.remember('fill')).toBe('#000000')
    })
    it('acts as a getter with one string argument', function() {
      rect.remember('opacity', 0.85)
      expect(rect.remember('opacity')).toBe(0.85)
    })
    it('saves values to individual objects', function() {
      rect.remember('opacity', 0.85)
      circle.remember('opacity', 0.5)
      expect(rect.remember('opacity')).toBe(0.85)
      expect(circle.remember('opacity')).toBe(0.5)
    })
  })

  describe('forget()', function() {
    it('deletes a given memory', function() {
      rect.remember({ grass: 'is green', one: 1 })
      rect.forget('grass')
      expect(rect.remember('grass')).toBe(undefined)
      expect(rect.remember('one')).toBe(1)
    })
    it('accepts multiple arguments as different memories', function() {
      rect.remember({ grass: 'might be purple', two: 2, sea: true })
      rect.forget('grass', 'sea')
      expect(rect.remember('grass')).toBe(undefined)
      expect(rect.remember('sea')).toBe(undefined)
      expect(rect.remember('two')).toBe(2)
    })
    it('clears the whole memory without arguments', function() {
      rect.remember({ grass: 'is never pink', three: 3, tree: true })
      rect.forget()
      expect(rect.remember('grass')).toBe(undefined)
      expect(rect.remember('tree')).toBe(undefined)
      expect(rect.remember('three')).toBe(undefined)
    })
  })

})