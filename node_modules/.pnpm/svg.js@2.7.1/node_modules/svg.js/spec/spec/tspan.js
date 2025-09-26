describe('Tspan', function() {
  var text, tspan

  beforeEach(function() {
    text = draw.text(loremIpsum)
    tspan = text.tspan('Hello World')
  })

  afterEach(function() {
    draw.clear()
  })

  describe('newLine()', function() {
    it('converts the tspan to a line', function() {
      tspan = text.tspan('Hello World')
      expect(tspan.newLine().dom.newLined).toBeTruthy()
    })
  })

  describe('text()', function() {
    it('returns the text of the tspan without newline when not newlined', function() {
      tspan = text.tspan('Hello World')
      expect(tspan.text()).toBe('Hello World')
    })
    it('returns the text of the tspan with newline when newlined', function() {
      tspan = text.tspan('Hello World').newLine()
      expect(tspan.text()).toBe('Hello World\n')
    })
    it('calls the function when function given', function() {
      var spy = jasmine.createSpy('dummy')
      tspan = text.tspan('Hello World')
      tspan.text(spy)
      expect(spy).toHaveBeenCalledWith(tspan)
    })
  })

  describe('dx()', function() {
    it('gets the dx value with no argument', function() {
      tspan.attr('dx', 25)
      expect(tspan.dx()).toBe(25)
    })
    it('sets the dx value whith the first argument', function() {
      expect(tspan.dx(25).attr('dx')).toBe(25)
    })
  })
})
