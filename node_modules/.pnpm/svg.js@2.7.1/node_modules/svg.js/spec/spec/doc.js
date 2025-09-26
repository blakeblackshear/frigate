describe('Doc', function() {

  describe('create()', function(){
    it('doenst alter size when adopting width SVG()', function() {
      var svg = SVG('inlineSVG')
      expect(svg.width()).toBe(0)
      expect(svg.height()).toBe(0)
    })
  })

  it('is an instance of SVG.Container', function() {
    expect(draw instanceof SVG.Container).toBe(true)
  })

  it('is an instance of SVG.Doc', function() {
    expect(draw instanceof SVG.Doc).toBe(true)
  })

  it('returns itself as Doc', function() {
    expect(draw.doc()).toBe(draw)
  })

  it('has a defs element', function() {
    expect(draw.defs() instanceof SVG.Defs).toBe(true)
  })

  describe('defs()', function() {
    it('returns defs element', function(){
      expect(draw.defs()).toBe(draw._defs)
    })
    it('references parent node', function(){
      expect(draw.defs().parent()).toBe(draw)
    })
  })

  describe('remove()', function() {
    it('removes the doc from the dom only if doc is not root element', function() {
      var cnt = window.document.querySelectorAll('svg').length
      draw.remove()
      if(parserInDoc){
        expect(window.document.querySelectorAll('svg').length).toBe(cnt)
      }else{
        expect(window.document.querySelectorAll('svg').length).toBe(cnt-1)
      }

      draw = SVG(drawing).size(100,100);
      expect(window.document.querySelectorAll('svg').length).toBe(cnt)
    })
  })

  describe('clone()', function () {
    it('clones the doc and inserts the clone after the doc', function () {
      var clone = draw.clone()

      expect(draw.node.nextSibling).toBe(clone.node)
      clone.remove()
    })
    it('clones the doc and inserts the clone in the provided parent', function () {
      var el = document.createElement('div')
      var clone = draw.clone(el)

      expect(clone.node.parentNode).toBe(el)
    })
  })

  describe('parent()', function () {
    it('returns null if nodeName is document-fragment', function() {
      var fragment = document.createDocumentFragment();
      var svgFrag = new SVG(fragment);
      expect(svgFrag.parent()).toBe(null);
    })
  })

})
