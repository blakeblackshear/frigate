describe('Set', function() {
  var set, e1, e2, e3, e4, e5

  beforeEach(function() {
    draw.attr('viewBox', null)
    set = draw.set()
    e1  = draw.rect(100,100).attr('id', 'e1').move(200,250)
    e2  = draw.ellipse(100,100).attr('id', 'e2')
    e3  = draw.line(0,0,100,100).attr('id', 'e3')
    e4  = draw.circle(50).attr('id', 'e4')
    e5  = draw.polyline('0,0 10,20 30,50 80,100').attr('id', 'e5')
  })

  afterEach(function() {
    draw.clear()
  })

  it('creates the set method on SVG.Container instances', function() {
    expect(draw.set() instanceof SVG.Set).toBeTruthy()
  })

  it('creates a set with initial value', function() {
    var members = [1, 2, 4]

    expect(draw.set(members).valueOf()).toBe(members)
  })

  it('creates a set when passing another set', function() {
    var set = new SVG.Set([1, 2, 4])
    var set2 = new SVG.Set(set)

    expect(set.valueOf()).not.toBe(set2.valueOf())
    expect(set.valueOf()).toEqual(set2.valueOf())
  })

  describe('add()', function() {
    it('returns the set instance', function() {
      expect(set.add(e1)).toBe(set)
    })
    it('stores given element', function() {
      set.add(e1).add(e2).add(e3)
      expect(set.valueOf()).toEqual([e1,e2,e3])
      expect(set.members.length).toBe(3)
    })
    it('accepts multiple elements at once', function() {
      set.add(e1, e2, e3, e4, e5)
      expect(set.valueOf()).toEqual([e1, e2, e3, e4, e5])
      expect(set.members.length).toBe(5)
    })
  })

  describe('remove()', function() {
    it('returns the set instance', function() {
      set.add(e1)
      expect(set.remove(e1)).toBe(set)
    })
    it('removes given element', function() {
      set.add(e1).add(e2).add(e3).remove(e2)
      expect(set.valueOf()).toEqual([e1,e3])
      expect(set.members.length).toBe(2)
    })
  })

  describe('each()', function() {
    it('returns the set instance', function() {
      expect(set.each(function(){})).toBe(set)
    })
    it('iterates over all members of the set', function() {
      var ids = []
      set.add(e1).add(e2).add(e3)

      set.each(function() {
        ids.push(this.attr('id'))
      })

      expect(ids.length).toBe(3)
      expect(ids).toEqual(['e1','e2','e3'])
    })
  })

  describe('clear()', function() {
    it('returns the set instance', function() {
      expect(set.clear()).toBe(set)
    })
    it('removes all members from set', function() {
      set.add(e1).add(e2).add(e3).add(e4).add(e5).clear()
      expect(set.members.length).toBe(0)
    })
  })

  describe('get()', function() {
    it('returns member at given index', function() {
      set.add(e1).add(e2).add(e3).add(e4).add(e5)
      expect(set.get(2)).toBe(e3)
    })
  })

  describe('first()', function() {
    it('returns first member', function() {
      set.add(e1).add(e2).add(e3).add(e4).add(e5)
      expect(set.first()).toBe(e1)
    })
  })

  describe('last()', function() {
    it('returns last member', function() {
      set.add(e1).add(e2).add(e3).add(e4).add(e5)
      expect(set.last()).toBe(e5)
    })
  })

  describe('has()', function() {
    it('checks if a given element is present in set', function() {
      set.add(e1).add(e2).add(e3).add(e4).add(e5)
      expect(set.has(e4)).toBeTruthy()
    })
  })

  describe('length()', function() {
    it('gets the length of the set', function() {
      set.add(e1).add(e2).add(e3).add(e4).add(e5)
      expect(set.length()).toBe(5)
    })
  })

  describe('index()', function() {
    it('returns the index of a given element within the set', function() {
      set.add(e1).add(e2).add(e3).add(e5)
      expect(set.index(e1)).toBe(0)
      expect(set.index(e2)).toBe(1)
      expect(set.index(e3)).toBe(2)
      expect(set.index(e4)).toBe(-1)
      expect(set.index(e5)).toBe(3)
    })
  })

  describe('valueOf()', function() {
    it('returns the members array', function() {
      set.add(e1)
      expect(set.valueOf()).toBe(set.members)
    })
  })

  describe('bbox()', function() {
    it('returns the bounding box of all elements', function() {
      set.add(e1).add(e2).add(e3).add(e4).add(e5)

      var box = set.bbox()

      expect(box.x).toBeCloseTo(0)
      expect(box.y).toBeCloseTo(0, 0)
      expect(box.width).toBeCloseTo(300)
      expect(box.height).toBeCloseTo(350)
    })
    it('returns an instance of SVG.RBox', function() {
      set.add(e1).add(e2).add(e3).add(e4).add(e5)

      expect(set.bbox() instanceof SVG.RBox).toBeTruthy()
    })
    it('returns an empty bounding box wiht no members', function() {
      var box = set.bbox()

      expect(box.x).toBe(0)
      expect(box.y).toBe(0)
      expect(box.width).toBe(0)
      expect(box.height).toBe(0)
    })
  })

  describe('method alias', function() {

    describe('attr()', function() {
      it('is applied to every member of the set', function() {
        var fills = []

        set.add(e1).add(e2).add(e3).add(e4).add(e5).attr('fill', '#ff0099')
        set.each(function() {
          fills.push(this.attr('fill'))
        })

        expect(fills).toEqual(['#ff0099','#ff0099','#ff0099','#ff0099','#ff0099'])
      })
    })

  })

  describe('method inheritance', function() {

    beforeEach(function() {
      SVG.extend(SVG.Element, {
        orange: function() {
          this.fill('#ff6600')
        }
      })
    })

    it('inherits newly added element methods after initialisation', function() {
      expect(typeof set.orange).toBe('function')
    })

    it('applies newly inherited methods properly to members', function() {
      var fills = []

      set.add(e1).add(e2).add(e3).add(e4).add(e5).orange()
      set.each(function() {
        fills.push(this.attr('fill'))
      })

      expect(fills).toEqual(['#ff6600','#ff6600','#ff6600','#ff6600','#ff6600'])
    })

  })

})
