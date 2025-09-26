describe('ClipPath', function() {
  var rect, circle

  beforeEach(function() {
    rect   = draw.rect(100,100)
    circle = draw.circle(100).move(50, 50)
    rect.clipWith(circle)
  })

  afterEach(function() {
    draw.clear()
  })

  it('moves the clipping element to a new clip node', function() {
    expect(circle.parent() instanceof SVG.ClipPath).toBe(true)
  })
  
  it('creates the clip node in the defs node', function() {
    expect(circle.parent().parent()).toBe(draw.defs())
  })

  it('sets the "clip-path" attribute on the cliped element with the clip id', function() {
    expect(rect.attr('clip-path')).toBe('url("#' + circle.parent().attr('id') + '")')
  })

  it('references the clip element in the masked element', function() {
    expect(rect.clipper).toBe(circle.parent())
  })

  it('references the clipped element in the clipPath target list', function() {
    expect(rect.clipper.targets.indexOf(rect) > -1).toBe(true)
  })
  
  it('reuses clip element when clip was given', function() {
    var clip = rect.clipper
    expect(draw.rect(100,100).clipWith(clip).clipper).toBe(clip)
  })

  it('unclips all clipped elements when being removed', function() {
    rect.clipper.remove()
    expect(rect.attr('clip-path')).toBe(undefined)
  })

  describe('unclip()', function() {

    it('clears the "clip-path" attribute on the clipped element', function() {
      rect.unclip()
      expect(rect.attr('clip-path')).toBe(undefined)
    })

    it('removes the reference to the clipping element', function() {
      rect.unclip()
      expect(rect.clipper).toBe(undefined)
    })

    it('returns the clipPath element', function() {
      expect(rect.unclip()).toBe(rect)
    })

  })

})