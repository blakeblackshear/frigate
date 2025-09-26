describe('Marker', function() {
  
  describe('on a container element', function() {
    var marker

    beforeEach(function() {
      marker = draw.marker(10, 12, function(add) {
        add.rect(10, 12)

        this.ref(5, 6)
      })
    })

    it('creates an instance of SVG.Marker', function() {
      expect(marker instanceof SVG.Marker).toBeTruthy()
    })

    it('creates marker in defs', function() {
      expect(marker.parent() instanceof SVG.Defs).toBeTruthy()
    })

    describe('marker()', function() {
      it('returns the marker element', function() {
        expect(marker = draw.marker(10, 12)).toBe(marker)
      })
      it('sets the refX to half of the given width', function() {
        marker = draw.marker(10, 12)
        expect(marker.node.getAttribute('refX')).toBe('5')
      })
      it('sets the refY to half of the given height', function() {
        marker = draw.marker(13, 15)
        expect(marker.node.getAttribute('refY')).toBe('7.5')
      })
    })

  })
  
  describe('on a target path', function() {
    var path, marker

    beforeEach(function() {
      path = draw.path('M 100 200 C 200 100 300  0 400 100 C 500 200 600 300 700 200 C 800 100 900 100 900 100')

      path.marker('mid', 10, 12, function(add) {
        add.rect(10, 12)

        this.ref(5, 6)
      })

      marker = path.marker('mid', 10, 10)
    })

    it('creates an instance of SVG.Marker', function() {
      expect(path.reference('marker-mid') instanceof SVG.Marker).toBeTruthy()
    })

    describe('marker()', function() {
      it('returns the target element', function() {
        expect(path.marker('start', 10, 12)).toBe(path)
      })
      it('creates a marker and applies it to the marker-start attribute', function() {
        path.marker('start', 10, 12)
        marker = path.reference('marker-start')

        expect(path.node.getAttribute('marker-start')).toBe(marker.toString())
      })
      it('creates a marker and applies it to the marker-mid attribute', function() {
        path.marker('mid', 10, 12)
        marker = path.reference('marker-mid')

        expect(path.node.getAttribute('marker-mid')).toBe(marker.toString())
      })
      it('creates a marker and applies it to the marker-end attribute', function() {
        path.marker('end', 10, 12)
        marker = path.reference('marker-end')

        expect(path.node.getAttribute('marker-end')).toBe(marker.toString())
      })
      it('accepts an instance of an existing marker element as the second argument', function() {
        marker = draw.marker(11, 11)
        path.marker('mid', marker)

        expect(path.node.getAttribute('marker-mid')).toBe(marker.toString())
      })
    })
  })


})