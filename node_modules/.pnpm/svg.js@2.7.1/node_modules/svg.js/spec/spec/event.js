describe('Event', function() {
  var rect, context
    , toast = null
    , fruitsInDetail = null,
    action = function(e) {
        toast = 'ready'
        context = this
        fruitsInDetail = e.detail || null
      }

  beforeEach(function() {
    rect = draw.rect(100, 100)
    spyOn(SVG,'on').and.callThrough()
  })

  afterEach(function() {
    toast = context = null
  })

  if (!this.isTouchDevice) {
    [ 'click'
    , 'dblclick'
    , 'mousedown'
    , 'mouseup'
    , 'mouseover'
    , 'mouseout'
    , 'mousemove'
    , 'mouseenter'
    , 'mouseleave'
    ].forEach(function(event) {
      describe(event+'()', function() {
        it('calls `on()` with '+event+' as event', function() {
          rect[event](action)
          expect(SVG.on).toHaveBeenCalledWith(rect, event, action)
        })
      })
    })
  } else {
    [ 'touchstart'
    , 'touchmove'
    , 'touchleave'
    , 'touchend'
    , 'touchcancel'
    ].forEach(function(event) {
      describe(event+'()', function() {
        it('calls `on()` with '+event+' as event', function() {
          rect[event](action)
          expect(SVG.on).toHaveBeenCalledWith(rect, event, action)
        })
      })
    })
  }

  describe('on()', function() {

    it('attaches an event to the element', function() {
      rect.on('event', action).fire('event')
      expect(toast).toBe('ready')
    })
    it('attaches an event to a non svg element', function() {
      var el = document.createElement('div')
      SVG.on(el, 'event', action)
      el.dispatchEvent(new window.CustomEvent('event'))
      expect(toast).toBe('ready')
      SVG.off(el, 'event', action)
    })
    it('attaches multiple handlers on different element', function() {
      var rect2 = draw.rect(100, 100)
      var rect3 = draw.rect(100, 100)

      rect.on('event', action)
      rect2.on('event', action)
      rect3.on('event', function(){ butter = 'melting' })
      rect3.on('event', action)

      expect(Object.keys(rect._events['event']['*']).length).toBe(1)  // 1 listener on rect
      expect(Object.keys(rect2._events['event']['*']).length).toBe(1) // 1 listener on rect2
      expect(Object.keys(rect3._events['event']['*']).length).toBe(2) // 2 listener on rect3
    })
    it('attaches a handler to a namespaced event', function(){
      var rect2 = draw.rect(100, 100)
      var rect3 = draw.rect(100, 100)

      rect.on('event.namespace1', action)
      rect2.on('event.namespace2', action)
      rect3.on('event.namespace3', function(){ butter = 'melting' })
      rect3.on('event', action)

      expect(rect._events['event']['*']).toBeUndefined()          // no global listener on rect
      expect(Object.keys(rect._events['event']['namespace1']).length).toBe( 1) // 1 namespaced listener on rect
      expect(Object.keys(rect2._events['event']['namespace2']).length).toBe(1) // 1 namespaced listener on rect2
      expect(Object.keys(rect3._events['event']['*']).length).toBe(1)          // 1 gobal listener on rect3
      expect(Object.keys(rect3._events['event']['namespace3']).length).toBe(1) // 1 namespaced listener on rect3
    })
    it('applies the element as context', function() {
      rect.on('event', action).fire('event')
      expect(context).toBe(rect)
    })
    it('applies given object as context', function() {
      rect.on('event', action, this).fire('event')
      expect(context).toBe(this)
    })
    it('stores the listener for future reference', function() {
      rect.on('event', action)
      expect(rect._events['event']['*'][action._svgjsListenerId]).not.toBeUndefined()
    })
    it('returns the called element', function() {
      expect(rect.on('event', action)).toBe(rect)
    })
  })

  describe('off()', function() {
    var butter = null

    beforeEach(function() {
      butter = null
    })

    it('detaches a specific event listener, all other still working', function() {
      rect2 = draw.rect(100,100)
      rect3 = draw.rect(100,100)

      rect.on('event', action)
      rect2.on('event', action)
      rect3.on('event', function(){ butter = 'melting' })

      rect.off('event', action)

      expect(Object.keys(rect._events['event']['*']).length).toBe(0)

      rect.fire('event')
      expect(toast).toBeNull()

      rect2.fire('event')
      expect(toast).toBe('ready')

      rect3.fire('event')
      expect(butter).toBe('melting')

      expect(rect._events['event']['*'][action]).toBeUndefined()
    })
    it('detaches a specific namespaced event listener, all other still working', function() {
      rect2 = draw.rect(100,100)
      rect3 = draw.rect(100,100)

      rect.on('event.namespace', action)
      rect2.on('event.namespace', action)
      rect3.on('event.namespace', function(){ butter = 'melting' })

      rect.off('event.namespace', action)

      expect(Object.keys(rect._events['event']['namespace']).length).toBe(0)
      expect(Object.keys(rect2._events['event']['namespace']).length).toBe(1)

      rect.fire('event')
      expect(toast).toBeNull()

      rect2.fire('event')
      expect(toast).toBe('ready')

      rect3.fire('event')
      expect(butter).toBe('melting')

      expect(rect._events['event']['namespace'][action]).toBeUndefined()
    })
    it('detaches all listeners for a specific namespace', function() {
      rect.on('event', action)
      rect.on('event.namespace', function() { butter = 'melting'; })
      rect.off('.namespace')

      rect.fire('event')
      expect(toast).toBe('ready')
      expect(butter).toBeNull()
    })
    it('detaches all listeners for an event without a listener given', function() {
      rect.on('event', action)
      rect.on('event.namespace', function() { butter = 'melting'; })
      rect.off('event')

      rect.fire('event')
      expect(toast).toBeNull()
      expect(butter).toBeNull()
      expect(rect._events['event']).toBeUndefined()
    })
    it('detaches all listeners without an argument', function() {
      rect.on('event', action)
      rect.on('click', function() { butter = 'melting' })
      rect.off()
      rect.fire('event')
      rect.fire('click')
      expect(toast).toBeNull()
      expect(butter).toBeNull()
      expect(Object.keys(rect._events).length).toBe(0)
    })
    it('returns the called element', function() {
      expect(rect.off('event', action)).toBe(rect)
    })
    it('does not throw when event is removed which was already removed with a global off', function() {
      var undefined

      rect.on('event', action)
      rect.off()
      try{
        rect.off('event')
      }catch(e){
        expect('Should not error out').toBe(true)
      }

      expect(Object.keys(rect._events).length).toBe(0)
    })
  })

  describe('fire()', function() {

    beforeEach(function() {
      rect.on('event', action)
    })

    it('fires an event for the element', function() {
      expect(toast).toBeNull()
      rect.fire('event')
      expect(toast).toBe('ready')
      expect(fruitsInDetail).toBe(null)
    })
    it('returns the called element', function() {
      expect(rect.fire('event')).toBe(rect)
    })
    it('fires event with additional data', function() {
      expect(fruitsInDetail).toBeNull()
      rect.fire('event', {apple:1})
      expect(fruitsInDetail).not.toBe(null)
      expect(fruitsInDetail.apple).toBe(1)
    })
    it('fires my own event', function() {
      toast = null
      rect.fire(new window.CustomEvent('event'))
      expect(toast).toBe('ready')
    })
    it('makes the event cancelable', function() {
      rect.on('event', function(e) {
        e.preventDefault()
      })
      rect.fire('event')
      expect(rect._event.defaultPrevented).toBe(true)
    })
  })

  describe('event()', function() {
    it('returns null when no event was fired', function() {
      expect(rect.event()).toBe(null)
    })
    it('returns the last fired event', function() {
      var event = new window.CustomEvent('foo')
      rect.fire(event)
      expect(rect.event()).toBe(event)

      event = new window.CustomEvent('bar')
      rect.fire(event)
      expect(rect.event()).toBe(event)
    })
  })
})
