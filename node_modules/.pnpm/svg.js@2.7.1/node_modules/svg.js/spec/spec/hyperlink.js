describe('Hyperlink', function() {
  var link
    , url = 'http://svgjs.com'

  beforeEach(function() {
    link = draw.link(url)
    link.rect(100,100)
  })
  
  afterEach(function() {
    draw.clear()
  })

  it('creates a link', function() {
    expect(link.attr('href')).toBe(url)
  })

  describe('to()', function() {
    it('creates xlink:href attribute', function() {
      link.to('http://apple.com')
      expect(link.attr('href')).toBe('http://apple.com')
    })
  })

  describe('show()', function() {
    it('creates xlink:show attribute', function() {
      link.show('replace')
      expect(link.attr('show')).toBe('replace')
    })
  })

  describe('target()', function() {
    it('creates target attribute', function() {
      link.target('_blank')
      expect(link.attr('target')).toBe('_blank')
    })
  })

  describe('SVG.Element', function() {
    var element

    beforeEach(function() {
      element = draw.rect(100,100)
    })

    describe('linkTo()', function() {
      it('wraps the called element in a link with given url', function() {
        element.linkTo(url)
        expect(element.parent().attr('href')).toBe(url)
      })
      it('wraps the called element in a link with given block', function() {
        element.linkTo(function(link) {
          link.to(url).target('_blank')
        })
        expect(element.parent().attr('href')).toBe(url)
        expect(element.parent().attr('target')).toBe('_blank')
      })
    })
  })

})