// IMPORTANT!!!
// The native getBBox() on text elements isn't always accurate in the decimals.
// Therefore sometimes some rounding is used to make test work as expected.

describe('Text', function() {
  var text

  beforeEach(function() {
    text = draw.text(loremIpsum).size(5)
  })

  afterEach(function() {
    draw.clear()
  })

  describe('leading()', function() {
    it('returns the leading value of the text without an argument', function() {
      expect(text.leading() instanceof SVG.Number)
      expect(text.leading().valueOf()).toBe(1.3)
    })
    it('sets the leading value of the text with the first argument', function() {
      expect(text.leading(1.5).dom.leading.valueOf()).toBe(1.5)
    })
  })

  describe('rebuild()', function() {
    it('disables the rebuild if called with false', function() {
      expect(text.rebuild(false)._rebuild).toBeFalsy()
    })
    it('enables the rebuild if called with true', function() {
      expect(text.rebuild(true)._rebuild).toBeTruthy()
    })
    it('rebuilds the text without an argument given', function() {
      var dy = text.lines().get(2).attr('dy')
      text.leading(1.7)
      expect(dy == text.lines().get(2).attr('dy')).toBeFalsy()
    })
  })

  describe('x()', function() {
    it('returns the value of x without an argument', function() {
      expect(text.x()).toBe(0)
    })
    it('sets the value of x with the first argument', function() {
      text.x(123)
      expect(text.node.getAttribute('x')).toBeCloseTo(123)
    })
    it('sets the value of all lines', function() {
      text.x(200)
      text.lines().each(function() {
        expect(this.x()).toBe(200)
      })
    })
    it('sets the value of y with a percent value', function() {
      text.x('40%')
      expect(text.node.getAttribute('x')).toBe('40%')
    })
    it('returns the value of x when x is a percentual value', function() {
      expect(text.x('45%').x()).toBe('45%')
    })
    // Woow this test is old. The functionality not even implemented anymore
    // Was a good feature. Maybe we add it back?
    /*it('sets the value of x based on the anchor with the first argument', function() {
      text.x(123, true)
      var box = text.bbox()
      expect(box.x).toBeCloseTo(123)
    })*/
  })

  describe('y()', function() {
    it('returns the value of y without an argument', function() {
      expect(text.y(0).y()).toBeCloseTo(0)
    })
    it('returns the value of y when y is a percentual value', function() {
      expect(text.y('45%').y()).toBe('45%')
    })
    it('sets the value of y with the first argument', function() {
      text.y(345)
      var box = text.bbox()
      expect(box.y).toBe(345)
    })
    it('sets the value of y with SVG.Number as first argument', function() {
      text.y(new SVG.Number(345))
      var box = text.bbox()
      expect(box.y).toBe(345)
    })
    it('sets the value of y with a percent value', function() {
      text.y('40%')
      expect(text.node.getAttribute('y')).toBe('40%')
    })
  })

  describe('cx()', function() {
    it('returns the value of cx without an argument', function() {
      var box = text.bbox()
      expect(text.cx()).toBeCloseTo(box.x + box.width / 2)
    })
    it('sets the value of cx with the first argument', function() {
      text.cx(123)
      var box = text.bbox()
      // this is a hack. it should be exactly 123 since you set it. But bbox with text is a thing...
      expect(box.cx).toBeCloseTo(box.x + box.width/2)
    })
    // not implemented anymore
    /*it('sets the value of cx based on the anchor with the first argument', function() {
      text.cx(123, true)
      var box = text.bbox()
      expect(box.cx).toBeCloseTo(123)
    })*/
  })

  describe('cy()', function() {
    it('returns the value of cy without an argument', function() {
      var box = text.bbox()
      expect(text.cy()).toBe(box.cy)
    })
    it('sets the value of cy with the first argument', function() {
      text.cy(345)
      var box = text.bbox()
      expect(Math.round(box.cy * 10) / 10).toBe(345)
    })
  })

  describe('move()', function() {
    it('sets the x and y position', function() {
      text.move(123,456)
      expect(text.node.getAttribute('x')).toBe('123')
      expect(text.y()).toBeCloseTo(456)
    })
  })

  describe('center()', function() {
    it('sets the cx and cy position', function() {
      text.center(321, 567)
      var box = text.bbox()
      expect(+text.node.getAttribute('x') + box.width / 2).toBeCloseTo(321, 1)
      expect(text.y() + box.height / 2).toBeCloseTo(567)
    })
  })

  describe('size()', function() {
    it('should define the width and height of the element', function() {
      text.size(50)
      expect(text.attr('font-size').valueOf()).toBe(50)
    })
  })

  describe('translate()', function() {
    it('sets the translation of an element', function() {
      text.transform({ x: 12, y: 12 })
      expect(text.node.getAttribute('transform')).toBe('matrix(1,0,0,1,12,12)')
    })
  })

  describe('text()', function() {
    it('adds content in a nested tspan', function() {
      text.text('It is a bear!')
      expect(text.node.childNodes[0].nodeType).toBe(1)
      expect(text.node.childNodes[0].childNodes[0].data).toBe('It is a bear!')
    })
    it('adds content in a nested tspan even with an empty string', function() {
      text.text('')
      expect(text.node.childNodes[0].nodeType).toBe(1)
      expect(text.node.childNodes[0].childNodes[0].data).toBe('')
    })
    it('creates multiple lines with a newline separated string', function() {
      text.text('It is\nJUST\na bear!')
      expect(text.node.childNodes.length).toBe(3)
    })
    it('restores the content from the dom', function() {
      text.text('It is\nJUST\na bear!')
      expect(text.text()).toBe('It is\nJUST\na bear!')
    })
    it('gets the given content of a text element without an argument', function() {
      text.text('It is another bear!')
      expect(text.node.childNodes[0].nodeType).toBe(1)
      expect(text.text()).toMatch('It is another bear!')
    })
    it('accepts a block as first arguments', function() {
      text.text(function(add) {
        add.tspan('mastaba')
        add.plain('hut')
      })
      expect(text.node.childNodes[0].nodeType).toBe(1)
      expect(text.node.childNodes[0].childNodes[0].data).toBe('mastaba')
      expect(text.node.childNodes[1].nodeType).toBe(3)
      expect(text.node.childNodes[1].data).toBe('hut')
    })
  })

  describe('plain()', function() {
    it('adds content without a tspan', function() {
      text.plain('It is a bear!')
      expect(text.node.childNodes[0].nodeType).toBe(3)
      expect(text.node.childNodes[0].data).toBe('It is a bear!')
    })
    it('clears content before adding new content', function() {
      text.plain('It is not a bear!')
      expect(text.node.childNodes.length).toBe(1)
      expect(text.node.childNodes[0].data).toBe('It is not a bear!')
    })
    it('restores the content from the dom', function() {
      text.plain('Just plain text!')
      expect(text.text()).toBe('Just plain text!')
    })
  })

  describe('tspan()', function() {
    it('adds content in a tspan', function() {
      text.tspan('It is a bear!')
      expect(text.node.childNodes[0].nodeType).toBe(1)
      expect(text.node.childNodes[0].childNodes[0].data).toBe('It is a bear!')
    })
    it('clears content before adding new content', function() {
      text.tspan('It is not a bear!')
      expect(text.node.childNodes.length).toBe(1)
      expect(text.node.childNodes[0].childNodes[0].data).toBe('It is not a bear!')
    })
  })

  describe('clear()', function() {
    it('removes all content', function() {
      text.text(function(add) {
        add.tspan('The first.')
        add.tspan('The second.')
        add.tspan('The third.')
      })
      expect(text.node.childNodes.length).toBe(3)
      text.clear()
      expect(text.node.childNodes.length).toBe(0)
    })
  })

  describe('lines()', function() {
    it('gets an array of individual lines as an instance of SVG.Set', function() {
      var l1, l2, l3
      text.text(function(add) {
        l1 = add.tspan('The first.')
        l2 = add.tspan('The second.')
        l3 = add.tspan('The third.')
      })
      expect(text.lines().length()).toBe(3)
      expect(text.lines().get(0)).toBe(l1)
      expect(text.lines().get(1)).toBe(l2)
      expect(text.lines().get(2)).toBe(l3)
    })
  })

  describe('length()', function() {
    it('gets total length of text', function() {
      text.text(function(add) {
        add.tspan('The first.')
        add.tspan('The second.')
        add.tspan('The third.')
      })
      expect(text.length()).toBeCloseTo(text.lines().get(0).length() + text.lines().get(1).length() + text.lines().get(2).length(), 3)
    })
  })

  describe('build()', function() {
    it('enables adding multiple plain text nodes when given true', function() {
      text.clear().build(true)
      text.plain('A great piece!')
      text.plain('Another great piece!')
      expect(text.node.childNodes[0].data).toBe('A great piece!')
      expect(text.node.childNodes[1].data).toBe('Another great piece!')
    })
    it('enables adding multiple tspan nodes when given true', function() {
      text.clear().build(true)
      text.tspan('A great piece!')
      text.tspan('Another great piece!')
      expect(text.node.childNodes[0].childNodes[0].data).toBe('A great piece!')
      expect(text.node.childNodes[1].childNodes[0].data).toBe('Another great piece!')
    })
    it('disables adding multiple plain text nodes when given false', function() {
      text.clear().build(true)
      text.plain('A great piece!')
      text.build(false).plain('Another great piece!')
      expect(text.node.childNodes[0].data).toBe('Another great piece!')
      expect(text.node.childNodes[1]).toBe(undefined)
    })
    it('disables adding multiple tspan nodes when given false', function() {
      text.clear().build(true)
      text.tspan('A great piece!')
      text.build(false).tspan('Another great piece!')
      expect(text.node.childNodes[0].childNodes[0].data).toBe('Another great piece!')
      expect(text.node.childNodes[1]).toBe(undefined)
    })
  })

  describe('setData()', function() {
    it('read all data from the svgjs:data attribute and assign it to el.dom', function(){

      text.attr('svgjs:data', '{"foo":"bar","leading":"3px"}')
      text.setData(JSON.parse(text.attr('svgjs:data')))

      expect(text.dom.foo).toBe('bar')
      expect(text.dom.leading instanceof SVG.Number).toBeTruthy()
      expect(text.dom.leading.value).toBe(3)
      expect(text.dom.leading.unit).toBe('px')
    })
  })

})
