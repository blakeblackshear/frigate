describe('Selector', function() {

  describe('get()', function() {
    it('gets an element\'s instance by id', function() {
      var rect = draw.rect(111, 333)
      
      expect(SVG.get(rect.attr('id'))).toBe(rect)
    })
    it('makes all the element\'s methods available', function() {
      var element = draw.group()
        , got = SVG.get(element.attr('id'))
      
      expect(got.attr()).toEqual(element.attr())
    })
    it('gets a referenced element by attribute value', function() {
      var rect = draw.defs().rect(100, 100)
        , use  = draw.use(rect)
        , mark = draw.marker(10, 10)
        , path = draw.path(svgPath).marker('end', mark)

      expect(SVG.get(use.attr('href'))).toBe(rect)
      expect(SVG.get(path.attr('marker-end'))).toBe(mark)
    })
  })

  describe('select()', function() {
    var e1, e2, e3, e4 ,e5

    beforeEach(function() {
      e1 = draw.rect(100, 100).addClass('selectable-element')
      e2 = draw.rect(100, 100).addClass('unselectable-element')
      e3 = draw.rect(100, 100).addClass('selectable-element')
      e4 = draw.rect(100, 100).addClass('unselectable-element')
      e5 = draw.rect(100, 100).addClass('selectable-element')
    })
    it('gets all elements with a given class name', function() {
      expect(SVG.select('rect.selectable-element').valueOf()).toEqual([e1, e3, e5])
    })
    it('returns an instance of SVG.Set', function() {
      expect(SVG.select('rect.selectable-element') instanceof SVG.Set).toBe(true)
    })
  })

  describe('Parent#select()', function() {
    it('gets all elements with a given class name inside a given element', function() {
      var group = draw.group()
        , e1 = draw.rect(100, 100).addClass('selectable-element')
        , e2 = draw.rect(100, 100).addClass('unselectable-element')
        , e3 = group.rect(100, 100).addClass('selectable-element')
        , e4 = draw.rect(100, 100).addClass('unselectable-element')
        , e5 = group.rect(100, 100).addClass('selectable-element')

      expect(group.select('rect.selectable-element').valueOf()).toEqual([e3, e5])
    })
  })
  
})