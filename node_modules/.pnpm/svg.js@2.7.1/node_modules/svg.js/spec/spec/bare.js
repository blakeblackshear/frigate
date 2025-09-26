describe('Bare', function() {

  describe('element()', function() {
    var element

    beforeEach(function() {
      element = draw.element('rect')
    })

    it('creates an instance of SVG.Bare', function() {
      expect(element instanceof SVG.Bare).toBeTruthy()
    })
    it('creates element in called parent', function() {
      expect(element.parent()).toBe(draw)
    })
    it('inherits from given parent', function() {
      expect(draw.element('g', SVG.Container).rect).toBeTruthy()
      expect(draw.element('g', SVG.Container).group).toBeTruthy()
    })
  })

  describe('words()', function() {
    it('inserts plain text in a node', function() {
      var element = draw.element('title').words('These are some words.').id(null)
      var result = element.svg()
      expect(
           result == '<title>These are some words.</title>'
        || result == '<title xmlns="http://www.w3.org/2000/svg">These are some words.</title>'
      ).toBe(true)
    })
    it('removes all nodes before adding words', function() {
      var element = draw.element('title').words('These are some words.').id(null)
      element.words('These are some words.')
      var result = element.svg()
      expect(
           result == '<title>These are some words.</title>'
        || result == '<title xmlns="http://www.w3.org/2000/svg">These are some words.</title>'
      ).toBe(true)
    })
  })
})
