describe('Container', function() {

  beforeEach(function() {
    draw.clear()
  })

  describe('rect()', function() {
    it('should increase children by 1', function() {
      var initial = draw.children().length
      draw.rect(100,100)
      expect(draw.children().length).toBe(initial + 1)
    })
    it('should create a rect', function() {
      expect(draw.rect(100,100).type).toBe('rect')
    })
    it('should create an instance of SVG.Rect', function() {
      expect(draw.rect(100,100) instanceof SVG.Rect).toBe(true)
    })
    it('should be an instance of SVG.Shape', function() {
      expect(draw.rect(100,100) instanceof SVG.Shape).toBe(true)
    })
    it('should be an instance of SVG.Element', function() {
      expect(draw.rect(100,100) instanceof SVG.Element).toBe(true)
    })
  })

  describe('ellipse()', function() {
    it('should increase children by 1', function() {
      var initial = draw.children().length
      draw.ellipse(100,100)
      expect(draw.children().length).toBe(initial + 1)
    })
    it('should create an ellipse', function() {
      expect(draw.ellipse(100,100).type).toBe('ellipse')
    })
    it('should create an instance of SVG.Ellipse', function() {
      expect(draw.ellipse(100,100) instanceof SVG.Ellipse).toBe(true)
    })
    it('should be an instance of SVG.Shape', function() {
      expect(draw.ellipse(100,100) instanceof SVG.Shape).toBe(true)
    })
    it('should be an instance of SVG.Element', function() {
      expect(draw.ellipse(100,100) instanceof SVG.Element).toBe(true)
    })
  })

  describe('circle()', function() {
    it('should increase children by 1', function() {
      var initial = draw.children().length
      draw.circle(100)
      expect(draw.children().length).toBe(initial + 1)
    })
    it('should create an circle', function() {
      expect(draw.circle(100).type).toBe('circle')
    })
    it('should create an instance of SVG.Circle', function() {
      expect(draw.circle(100) instanceof SVG.Circle).toBe(true)
    })
    it('should be an instance of SVG.Shape', function() {
      expect(draw.circle(100) instanceof SVG.Shape).toBe(true)
    })
    it('should be an instance of SVG.Element', function() {
      expect(draw.circle(100) instanceof SVG.Element).toBe(true)
    })
  })

  describe('line()', function() {
    it('should increase children by 1', function() {
      var initial = draw.children().length
      draw.line(0,100,100,0)
      expect(draw.children().length).toBe(initial + 1)
    })
    it('should create a line', function() {
      expect(draw.line(0,100,100,0).type).toBe('line')
    })
    it('should create an instance of SVG.Line', function() {
      expect(draw.line(0,100,100,0) instanceof SVG.Line).toBe(true)
    })
    it('should be an instance of SVG.Shape', function() {
      expect(draw.line(0,100,100,0) instanceof SVG.Shape).toBe(true)
    })
    it('should be an instance of SVG.Element', function() {
      expect(draw.line(0,100,100,0) instanceof SVG.Element).toBe(true)
    })
  })

  describe('polyline()', function() {
    it('should increase children by 1', function() {
      var initial = draw.children().length
      draw.polyline('0,0 100,0 100,100 0,100')
      expect(draw.children().length).toBe(initial + 1)
    })
    it('should create a polyline', function() {
      expect(draw.polyline('0,0 100,0 100,100 0,100').type).toBe('polyline')
    })
    it('should be an instance of SVG.Polyline', function() {
      expect(draw.polyline('0,0 100,0 100,100 0,100') instanceof SVG.Polyline).toBe(true)
    })
    it('should be an instance of SVG.Shape', function() {
      expect(draw.polyline('0,0 100,0 100,100 0,100') instanceof SVG.Shape).toBe(true)
    })
    it('should be an instance of SVG.Element', function() {
      expect(draw.polyline('0,0 100,0 100,100 0,100') instanceof SVG.Element).toBe(true)
    })
  })

  describe('polygon()', function() {
    it('should increase children by 1', function() {
      var initial = draw.children().length
      draw.polygon('0,0 100,0 100,100 0,100')
      expect(draw.children().length).toBe(initial + 1)
    })
    it('should create a polygon', function() {
      expect(draw.polygon('0,0 100,0 100,100 0,100').type).toBe('polygon')
    })
    it('should be an instance of SVG.Polygon', function() {
      expect(draw.polygon('0,0 100,0 100,100 0,100') instanceof SVG.Polygon).toBe(true)
    })
    it('should be an instance of SVG.Shape', function() {
      expect(draw.polygon('0,0 100,0 100,100 0,100') instanceof SVG.Shape).toBe(true)
    })
    it('should be an instance of SVG.Element', function() {
      expect(draw.polygon('0,0 100,0 100,100 0,100') instanceof SVG.Element).toBe(true)
    })
  })

  describe('path()', function() {
    it('should increase children by 1', function() {
      var initial = draw.children().length
      draw.path(svgPath)
      expect(draw.children().length).toBe(initial + 1)
    })
    it('should create a path', function() {
      expect(draw.path(svgPath).type).toBe('path')
    })
    it('should be an instance of SVG.Path', function() {
      expect(draw.path(svgPath) instanceof SVG.Path).toBe(true)
    })
    it('should be an instance of SVG.Shape', function() {
      expect(draw.path(svgPath) instanceof SVG.Shape).toBe(true)
    })
    it('should be an instance of SVG.Element', function() {
      expect(draw.path(svgPath) instanceof SVG.Element).toBe(true)
    })
  })

  describe('image()', function() {
    it('should increase children by 1', function() {
      var initial = draw.children().length
      draw.image(imageUrl, 100, 100)
      expect(draw.children().length).toBe(initial + 1)
    })
    it('should create a rect', function() {
      expect(draw.image(imageUrl, 100, 100).type).toBe('image')
    })
    it('should create an instance of SVG.Rect', function() {
      expect(draw.image(imageUrl, 100, 100) instanceof SVG.Image).toBe(true)
    })
    it('should be an instance of SVG.Shape', function() {
      expect(draw.image(imageUrl, 100, 100) instanceof SVG.Shape).toBe(true)
    })
    it('should be an instance of SVG.Element', function() {
      expect(draw.image(imageUrl, 100, 100) instanceof SVG.Element).toBe(true)
    })
  })

  describe('text()', function() {
    it('increases children by 1', function() {
      var initial = draw.children().length
      draw.text(loremIpsum)
      expect(draw.children().length).toBe(initial + 1)
    })
    it('creates a text element', function() {
      expect(draw.text(loremIpsum).type).toBe('text')
    })
    it('creates an instance of SVG.Rect', function() {
      expect(draw.text(loremIpsum) instanceof SVG.Text).toBe(true)
    })
    it('is an instance of SVG.Shape', function() {
      expect(draw.text(loremIpsum) instanceof SVG.Shape).toBe(true)
    })
    it('is an instance of SVG.Element', function() {
      expect(draw.text(loremIpsum) instanceof SVG.Element).toBe(true)
    })
  })

  describe('plain()', function() {
    it('increases children by 1', function() {
      var initial = draw.children().length
      draw.plain(loremIpsum)
      expect(draw.children().length).toBe(initial + 1)
    })
    it('creates a plain element', function() {
      expect(draw.plain(loremIpsum).type).toBe('text')
    })
    it('creates an instance of SVG.Rect', function() {
      expect(draw.plain(loremIpsum) instanceof SVG.Text).toBe(true)
    })
    it('is an instance of SVG.Shape', function() {
      expect(draw.plain(loremIpsum) instanceof SVG.Shape).toBe(true)
    })
    it('is an instance of SVG.Element', function() {
      expect(draw.plain(loremIpsum) instanceof SVG.Element).toBe(true)
    })
  })

  describe('clear()', function() {
    it('removes all children except the parser if present', function() {
      draw.rect(100,100)
      draw.clear()
      expect(draw.children().length).toBe(parserInDoc)
    })
    it('creates a new defs node', function() {
      var oldDefs = draw.defs()
      draw.rect(100,100).maskWith(draw.circle(100, 100))
      draw.clear()
      expect(draw.defs()).not.toBe(oldDefs)
    })
    it('clears all children in the defs node', function() {
      draw.rect(100,100).maskWith(draw.circle(100, 100))
      draw.clear()
      expect(draw.defs().children().length).toBe(0)
    })
  })

  describe('each()', function() {
    it('should iterate over all children', function() {
      var children = []

      draw.rect(100,100)
      draw.ellipse(100, 100)
      draw.polygon()

      draw.each(function() {
        children.push(this.type)
      })
      expect(children).toEqual((parserInDoc ? [parser[0].type] : []).concat(['rect', 'ellipse', 'polygon']))
    })
    it('should only include the its own children', function() {
      var children = []
        , group = draw.group()

      draw.rect(100,200)
      draw.circle(300)

      group.rect(100,100)
      group.ellipse(100, 100)
      group.polygon()

      group.each(function() {
        children.push(this)
      })

      expect(children).toEqual(group.children())
    })
    it('should traverse recursively when set to deep', function() {
      var children = []
        , group = draw.group()

      draw.rect(100,200)
      draw.circle(300)

      group.rect(100,100)
      group.ellipse(100, 100)
      group.polygon()

      draw.each(function() {
        children.push(this)
      }, true)

      expect(children.length).toEqual(draw.children().length + group.children().length + (parserInDoc ? parser[0].children().length : 0))
    })
  })

  describe('get()', function() {
    it('gets an element at a given index', function() {
      draw.clear()
      var rect = draw.rect(100,100)
      var circle = draw.circle(100)
      var line = draw.line(0,0,100,100)
      expect(draw.get(0+parserInDoc)).toBe(rect)
      expect(draw.get(1+parserInDoc)).toBe(circle)
      expect(draw.get(2+parserInDoc)).toBe(line)
      expect(draw.get(3+parserInDoc)).toBeNull()
    })
  })

  describe('first()', function() {
    it('gets the first child', function() {
      draw.clear()
      var rect = draw.rect(100,100)
      var circle = draw.circle(100)
      var line = draw.line(0,0,100,100)
      expect(draw.first()).toBe(parserInDoc ? parser[0] : rect)
    })
  })

  describe('last()', function() {
    it('gets the last child', function() {
      draw.clear()
      var rect = draw.rect(100,100)
      var circle = draw.circle(100)
      var line = draw.line(0,0,100,100)
      expect(draw.last()).toBe(line)
    })
  })

  describe('has()', function() {
    it('determines if a given element is a child of the parent', function() {
      var rect = draw.rect(100,100)
      var circle = draw.circle(100)
      var group = draw.group()
      var line = group.line(0,0,100,100)
      expect(draw.has(rect)).toBe(true)
      expect(draw.has(circle)).toBe(true)
      expect(draw.has(group)).toBe(true)
      expect(draw.has(line)).toBe(false)
      expect(group.has(line)).toBe(true)
    })
  })

  describe('index()', function() {
    it('determines the index of given element', function() {
      var rect = draw.rect(100,100)
      var circle = draw.circle(100)
      var group = draw.group()
      var line = group.line(0,0,100,100)
      expect(draw.index(rect)).toBe(0+parserInDoc)
      expect(draw.index(circle)).toBe(1+parserInDoc)
      expect(draw.index(group)).toBe(2+parserInDoc)
      expect(draw.index(line)).toBe(-1)
      expect(group.index(line)).toBe(0)
    })
  })

  describe('parent()', function() {
    it('returns the parent element instance', function() {
      var rect = draw.rect(100,100)
      expect(rect.parent()).toBe(rect.node.parentNode.instance)
    })
  })

  describe('defs()', function() {
    it('returns the defs from the svg', function() {
      var g = draw.group()
      expect(g.defs()).toBe(draw.doc().defs())
      expect(g.defs() instanceof SVG.Defs).toBeTruthy()
    })
  })

})











