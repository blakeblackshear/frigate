describe('Group', function() {
  var group

  beforeEach(function() {
    group = draw.group().move(50, 50)
    group.rect(100,100)
  })

  afterEach(function() {
    draw.clear()
  })

  describe('x()', function() {
    it('returns the value of x without an argument', function() {
      expect(group.x()).toBe(50)
    })
    it('sets the value of x with the first argument', function() {
      group.x(123)
      var box = group.gbox()
      expect(box.x).toBe(123)
    })
    it('sets the value of x correctly when called multiple times', function() {
      group.x(10).x(100).x(13)
      var box = group.gbox()
      expect(box.x).toBe(13)
    })
    it('sets the value of x correctly when the first argument is a string number', function(){
      group.x('123')
      var box = group.gbox()
      expect(box.x).toBe(123)
    })
  })

  describe('y()', function() {
    it('returns the value of y without an argument', function() {
      expect(group.y()).toBe(50)
    })
    it('sets the value of y with the first argument', function() {
      group.y(345)
      var box = group.gbox()
      expect(box.y).toBe(345)
    })
    it('sets the value of y correctly when called multiple times', function() {
      group.y(1).y(10).y(15)
      var box = group.gbox()
      expect(box.y).toBe(15)
    })
    it('sets the value of y correctly when the first argument is a string number', function(){
      group.y('124')
      var box = group.gbox()
      expect(box.y).toBe(124)
    })
  })

  describe('cx()', function() {
    it('returns the value of cx without an argument', function() {
      expect(group.cx()).toBe(100)
    })
    it('sets the value of cx with the first argument', function() {
      group.cx(123)
      var box = group.gbox()
      expect(box.cx).toBe(123)
    })
  })

  describe('cy()', function() {
    it('returns the value of cy without an argument', function() {
      expect(group.cy()).toBe(100)
    })
    it('sets the value of cy with the first argument', function() {
      group.cy(345)
      var box = group.gbox()
      expect(box.cy).toBe(345)
    })
  })

  describe('move()', function() {
    it('sets the x and y position', function() {
      group.move(123,456)
      expect(group.node.getAttribute('transform')).toBe('matrix(1,0,0,1,123,456)')
    })
  })

  describe('center()', function() {
    it('sets the cx and cy position', function() {
      group.center(321,567)
      var box = group.gbox()
      expect(box.cx).toBe(321)
      expect(box.cy).toBe(567)
    })
  })

  describe('dx()', function() {
    it('moves the x positon of the element relative to the current position', function() {
      group.move(50,60)
      group.dx(100)
      expect(group.node.getAttribute('transform')).toBe('matrix(1,0,0,1,150,60)')
    })
  })

  describe('dy()', function() {
    it('moves the y positon of the element relative to the current position', function() {
      group.move(50,60)
      group.dy(120)
      expect(group.node.getAttribute('transform')).toBe('matrix(1,0,0,1,50,180)')
    })
  })

  describe('dmove()', function() {
    it('moves the x and y positon of the element relative to the current position', function() {
      group.move(50, 60)
      group.dmove(80, 25)
      expect(group.node.getAttribute('transform')).toBe('matrix(1,0,0,1,130,85)')
    })
  })
})
