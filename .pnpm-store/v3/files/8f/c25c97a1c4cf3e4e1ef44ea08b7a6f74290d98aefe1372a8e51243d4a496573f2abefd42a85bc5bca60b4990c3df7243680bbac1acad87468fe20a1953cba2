describe('Box', function() {
  it('creates a new instance without passing anything', function() {
    var box = new SVG.Box

    expect(box instanceof SVG.Box).toBe(true)
    expect(box).toEqual(jasmine.objectContaining({
      x:0, y:0, cx:0, cy:0, width:0, height:0
    }))
  })

  it('creates a new instance with 4 arguments given', function() {
    var box = new SVG.Box(10, 20, 100, 50)

    expect(box instanceof SVG.Box).toBe(true)
    expect(box).toEqual(jasmine.objectContaining({
      x:10, y:20, cx:60, cy:45, width:100, height:50
    }))
  })

  it('creates a new instance with object given', function() {
    var box = new SVG.Box({x:10, y:20, width: 100, height:50})

    expect(box instanceof SVG.Box).toBe(true)
    expect(box).toEqual(jasmine.objectContaining({
      x:10, y:20, cx:60, cy:45, width:100, height:50
    }))
  })

  describe('merge()', function() {
    it('merges various bounding boxes', function() {
      var box1 = new SVG.Box(50, 50, 100, 100)
      var box2 = new SVG.Box(300, 400, 100, 100)
      var box3 = new SVG.Box(500, 100, 100, 100)
      var merged = box1.merge(box2).merge(box3)

      expect(merged).toEqual(jasmine.objectContaining({
        x: 50, y: 50, cx: 325, cy: 275, width: 550, height: 450
      }))
    })
    it('returns a new instance', function() {
      var box1 = new SVG.Box(50, 50, 100, 100)
      var box2 = new SVG.Box(300, 400, 100, 100)
      var merged = box1.merge(box2)
      expect(box1).not.toBe(merged)
      expect(box2).not.toBe(merged)

      expect(merged instanceof SVG.Box).toBe(true)
    })
  })

  describe('transform()', function() {
    it('transforms the box with given matrix', function() {
      var box1 = new SVG.Box(50, 50, 100, 100).transform(new SVG.Matrix(1,0,0,1,20,20))
      var box2 = new SVG.Box(50, 50, 100, 100).transform(new SVG.Matrix(2,0,0,2,0,0))
      var box3 = new SVG.Box(-200, -200, 100, 100).transform(new SVG.Matrix(1,0,0,1,-20,-20))

      expect(box1).toEqual(jasmine.objectContaining({
        x: 70, y: 70, cx: 120, cy: 120, width: 100, height: 100
      }))

      expect(box2).toEqual(jasmine.objectContaining({
        x: 100, y: 100, cx: 200, cy: 200, width: 200, height: 200
      }))

      expect(box3).toEqual(jasmine.objectContaining({
        x: -220, y: -220, cx: -170, cy: -170, width: 100, height: 100
      }))
    })
  })
})

describe('BBox', function() {

  afterEach(function() {
    draw.clear()
  })

  it('creates a new instance from an element', function() {
    var rect = draw.rect(100, 100).move(100, 25)
    var box = new SVG.BBox(rect)

    expect(box).toEqual(jasmine.objectContaining({
      x: 100, y: 25, cx: 150, cy: 75, width: 100, height: 100
    }))
  })

  describe('merge()', function() {
    it('returns an instance of SVG.BBox', function() {
      var box1 = new SVG.BBox(50, 50, 100, 100)
      var box2 = new SVG.BBox(300, 400, 100, 100)
      var merged = box1.merge(box2)

      expect(merged instanceof SVG.BBox).toBe(true)
    })
  })

})

describe('TBox', function() {

  afterEach(function() {
    draw.clear()
  })

  it('should map to RBox and be removed in 3.x', function() {
    var rect = draw.rect(100, 100).move(100, 25).stroke({width:0})
    var tbox = rect.tbox()

    expect(tbox.x).toBe(100)
    expect(tbox.y).toBeCloseTo(25)

    rect.transform({ scale: 1.5 })
    tbox = rect.tbox()
    expect(tbox.x).toBe(75)
    expect(tbox.y).toBe(0)

    rect.transform({ skewX: 5 })
    tbox = rect.tbox()
    expect(tbox.x|0).toBe(68)
    expect(tbox.y|0).toBe(0)
  })

})

describe('RBox', function() {

  afterEach(function() {
    draw.clear()
  })

  it('creates a new instance from an element', function() {
    var rect = draw.rect(100, 100).move(100, 25).stroke({width:0})
    var box = new SVG.RBox(rect).transform(rect.doc().screenCTM().inverse()).addOffset()
    expect(window.roundBox(box)).toEqual(jasmine.objectContaining({
      x: 100, y: 25, cx: 150, cy: 75, width: 100, height: 100
    }))
  })

  describe('merge()', function() {
    it('returns an instance of SVG.RBox', function() {
      var box1 = new SVG.RBox(50, 50, 100, 100)
      var box2 = new SVG.RBox(300, 400, 100, 100)
      var merged = box1.merge(box2)

      expect(merged instanceof SVG.RBox).toBe(true)
    })
  })
})

describe('Boxes', function() {
  var rect, nested, offset

  beforeEach(function() {
    offset = draw.screenCTM()
    draw.viewbox(100,100, 200, 200)
    nested = draw.nested().size(200, 200).move(100,100).viewbox(0, 0, 100, 100)
    rect = nested.rect(50, 180).stroke({width:0}).move(25, 90).scale(2, 0, 0).transform({x:10, y:10}, true)
  })
  afterEach(function() {
    draw.clear().attr('viewBox', null)
  })

  describe('bbox()', function() {
    it('returns an instance of SVG.BBox', function() {
      expect(rect.bbox() instanceof SVG.BBox).toBeTruthy()
    })
    it('matches the size of the target element, ignoring transformations', function() {
      var box = rect.bbox()

      expect(box).toEqual(jasmine.objectContaining({
        x: 25, y: 90, cx: 50, cy: 180, width: 50, height: 180
      }))
    })
    it('returns a box even if the element is not in the dom', function() {
      var line = new SVG.Line().plot(0, 0, 50, 50)
      var box = line.bbox()

      expect(box).toEqual(jasmine.objectContaining({
        x: 0, y: 0, width: 50, height: 50
      }))

      expect('Should not result into infinite loop').toBe('Should not result into infinite loop')
    })
    it('returns a box even if the element is not in the dom and invisible', function() {
      var line = new SVG.Line().plot(0, 0, 50, 50).hide()
      var box = line.bbox()

      expect(box).toEqual(jasmine.objectContaining({
        x: 0, y: 0, width: 50, height: 50
      }))

      expect('Should not result into infinite loop').toBe('Should not result into infinite loop')
    })
  })

  describe('rbox()', function() {
    it('returns an instance of SVG.RBox', function() {
      expect(rect.rbox() instanceof SVG.RBox).toBeTruthy()
    })

    it('returns the elements box in absolute screen coordinates by default', function() {
      var box = rect.rbox()

      expect(window.roundBox(box)).toEqual(jasmine.objectContaining(window.roundBox({
        x: 70 + offset.e, y: 200 + offset.f, width: 100, height: 360
      })))

    })

    it('returns the elements box in coordinates of given element (doc)', function() {
      var box = rect.rbox(draw)

      expect(window.roundBox(box)).toEqual(jasmine.objectContaining({
        x: 240, y: 500, width: 200, height: 720
      }))
    })

    it('returns the elements box in coordinates of given element (nested)', function() {
      var box = rect.rbox(nested)

      expect(window.roundBox(box)).toEqual(jasmine.objectContaining({
        x: 70, y: 200, width: 100, height: 360
      }))
    })
  })

})






