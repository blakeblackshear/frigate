describe('Arrange', function() {
  var e1, e2, e3

  beforeEach(function() {
    draw.clear()

    e1 = draw.rect(100,100).move(10,10).attr('id', 'e1')
    e2 = draw.ellipse(100,100).move(20,20).attr('id', 'e2')
    e3 = draw.line(0,0,100,100).move(30,30).attr('id', 'e3')
  })

  describe('siblings()', function() {
    it('returns all siblings of targeted element', function() {
      expect(e1.siblings().length).toBe(3+parserInDoc)
      expect(parser.concat([e1,e2,e3])).toEqual(e2.siblings())
    })
  })

  describe('position()', function() {
    it('returns the index position within it\'s parent', function() {
      expect(e1.siblings().length).toBe(3+parserInDoc)
      expect(e1.position()).toBe(0+parserInDoc)
      expect(e2.position()).toBe(1+parserInDoc)
      expect(e3.position()).toBe(2+parserInDoc)
    })
  })

  describe('next()', function() {
    it('returns the next sibling within the parent element', function() {
      expect(e1.next()).toBe(e2)
      expect(e2.next()).toBe(e3)
      expect(e3.next()).toBe(undefined)
    })
  })

  describe('previous()', function() {
    it('returns the previous sibling within the parent element', function() {
      expect(e1.previous()).toBe(parser[0])
      expect(e2.previous()).toBe(e1)
      expect(e3.previous()).toBe(e2)
    })
  })

  describe('forward()', function() {
    it('returns the element itself', function() {
      expect(e1.forward()).toBe(e1)
    })
    it('moves the element one step forward within its parent', function() {
      e1.forward()
      expect(e1.position()).toBe(1+parserInDoc)
      expect(e2.position()).toBe(0+parserInDoc)
      expect(e3.position()).toBe(2+parserInDoc)
    })
    it('keeps the last element at the same position', function() {
      e3.forward()
      expect(e3.position()).toBe(2+parserInDoc)
    })
    it('keeps the defs on top of the stack', function() {
      draw.defs()
      e3.forward()
      expect(draw.node.childNodes[2+parserInDoc]).toBe(e3.node)
      expect(draw.node.childNodes[3+parserInDoc]).toBe(draw.defs().node)
    })
  })

  describe('backward()', function() {
    it('returns the element itself', function() {
      if(parserInDoc){
        expect(parser[0].backward()).toBe(parser[0])
      }else{
        expect(e1.backward()).toBe(e1)
      }
    })
    it('moves the element one step backwards within its parent', function() {
      e3.backward()
      expect(e1.position()).toBe(0+parserInDoc)
      expect(e2.position()).toBe(2+parserInDoc)
      expect(e3.position()).toBe(1+parserInDoc)
    })
    it('keeps the first element at the same position', function() {
      e3.backward()
      expect(e1.position()).toBe(0+parserInDoc)
    })
  })

  describe('front()', function() {
    it('returns the element itself', function() {
      expect(e3.front()).toBe(e3)
    })
    it('moves the element to the top of the stack within its parent', function() {
      e1.front()
      expect(e1.position()).toBe(2+parserInDoc)
      expect(e2.position()).toBe(0+parserInDoc)
      expect(e3.position()).toBe(1+parserInDoc)
    })
    it('keeps the last element at the same position', function() {
      e3.front()
      expect(e3.position()).toBe(2+parserInDoc)
    })
    it('keeps the defs on top of the stack', function() {
      e1.front()
      expect(draw.node.childNodes[2+parserInDoc]).toBe(e1.node)
      expect(draw.node.childNodes[3+parserInDoc]).toBe(draw.defs().node)
    })
  })

  describe('back()', function() {
    it('returns the element itself', function() {
      expect(e3.back()).toBe(e3)
    })
    it('moves the element to the bottom of the stack within its parent', function() {
      e3.back()
      expect(e1.position()).toBe(1+parserInDoc)
      expect(e2.position()).toBe(2+parserInDoc)
      expect(e3.position()).toBe(0)
    })
    it('keeps the first element at the same position', function() {
      e1.back()
      expect(e1.position()).toBe(0)
    })
  })

  describe('before()', function() {
    it('returns the targeted element itself', function() {
      expect(e3.before(e1)).toBe(e3)
    })
    it('inserts a given element before the targeted element', function() {
      e3.before(e1)
      expect(e1.position()).toBe(1+parserInDoc)
      expect(e2.position()).toBe(0+parserInDoc)
      expect(e3.position()).toBe(2+parserInDoc)
    })
    it('moves elements between containers', function() {
      var group = draw.group()
        , e4 = group.rect(80,120)
        , e5 = group.rect(80,120)
        , e6 = group.rect(80,120)

      e2.before(e5)
      expect(e1.position()).toBe(0+parserInDoc)
      expect(e2.position()).toBe(2+parserInDoc)
      expect(e3.position()).toBe(3+parserInDoc)
      expect(e5.position()).toBe(1+parserInDoc)
    })
  })

  describe('after()', function() {
    it('returns the targeted element itself', function() {
      expect(e3.after(e1)).toBe(e3)
    })
    it('inserts a given element after the targeted element', function() {
      e3.after(e1)
      expect(e1.position()).toBe(2+parserInDoc)
      expect(e2.position()).toBe(0+parserInDoc)
      expect(e3.position()).toBe(1+parserInDoc)
    })
    it('moves elements between containers', function() {
      var group = draw.group()
        , e4 = group.rect(80,120)
        , e5 = group.rect(80,120)
        , e6 = group.rect(80,120)

      e2.after(e5)
      expect(e1.position()).toBe(0+parserInDoc)
      expect(e2.position()).toBe(1+parserInDoc)
      expect(e3.position()).toBe(3+parserInDoc)
      expect(e5.position()).toBe(2+parserInDoc)
    })
  })

})














