describe('Mask', function() {
  var rect, circle

  beforeEach(function() {
    rect   = draw.rect(100,100)
    circle = draw.circle(100).move(50, 50).fill('#fff')
    rect.maskWith(circle)
  })

  afterEach(function() {
    draw.clear()
  })

  it('moves the masking element to a new mask node', function() {
    expect(circle.parent() instanceof SVG.Mask).toBe(true)
  })
  
  it('creates the mask node in the defs node', function() {
    expect(circle.parent().parent()).toBe(draw.defs())
  })

  it('sets the "mask" attribute on the masked element with the mask id', function() {
    expect(rect.attr('mask')).toBe('url("#' + circle.parent().attr('id') + '")')
  })

  it('references the mask element in the masked element', function() {
    expect(rect.masker).toBe(circle.parent())
  })

  it('references the masked element in the mask target list', function() {
    expect(rect.masker.targets.indexOf(rect) > -1).toBe(true)
  })

  it('reuses mask element when mask was given', function() {
    var mask = rect.masker
    expect(draw.rect(100,100).maskWith(mask).masker).toBe(mask)
  })
  
  it('unmasks all masked elements when being removed', function() {
    rect.masker.remove()
    expect(rect.attr('mask')).toBe(undefined)
  })

  describe('unmask()', function() {

    it('clears the "mask" attribute on the masked element', function() {
      rect.unmask()
      expect(rect.attr('mask')).toBe(undefined)
    })

    it('removes the reference to the masking element', function() {
      rect.unmask()
      expect(rect.masker).toBe(undefined)
    })

    it('returns the element itslef', function() {
      expect(rect.unmask()).toBe(rect)
    })

  })

})