describe('Matrix', function() {
  var matrix

  describe('initialization', function() {

    describe('without a source', function() {

      beforeEach(function() {
        matrix = new SVG.Matrix
      })

      it('creates a new matrix with default values', function() {
        expect(matrix.a).toBe(1)
        expect(matrix.b).toBe(0)
        expect(matrix.c).toBe(0)
        expect(matrix.d).toBe(1)
        expect(matrix.e).toBe(0)
        expect(matrix.f).toBe(0)
      })

      describe('extract()', function() {
        var extract

        beforeEach(function() {
          extract = matrix.extract()
        })

        it('parses translation values', function() {
          expect(extract.x).toBe(0)
          expect(extract.y).toBe(0)
        })
        it('parses skew values', function() {
          expect(extract.skewX).toBe(0)
          expect(extract.skewY).toBe(0)
        })
        it('parses scale values', function() {
          expect(extract.scaleX).toBe(1)
          expect(extract.scaleY).toBe(1)
        })
        it('parses rotatoin value', function() {
          expect(extract.rotation).toBe(0)
        })
      })

      describe('toString()' , function() {
        it('exports correctly to a string', function() {
          expect(matrix.toString()).toBe('matrix(1,0,0,1,0,0)')
        })
      })
    })

    describe('with an element given', function() {
      var rect

      beforeEach(function() {
        rect = draw.rect(100, 100)
          .transform({ rotation: -10 }, true)
          .transform({ x: 40, y: 50 }, true)
          .transform({ scale: 2 }, true)

        matrix = new SVG.Matrix(rect)
      })

      it('parses the current transform matrix from an element', function() {
        expect(matrix.a).toBeCloseTo(1.9696155786514282)
        expect(matrix.b).toBeCloseTo(-0.3472963869571686)
        expect(matrix.c).toBeCloseTo(0.3472963869571686)
        expect(matrix.d).toBeCloseTo(1.9696155786514282)
        expect(matrix.e).toBeCloseTo(-17.770875930786133)
        expect(matrix.f).toBeCloseTo(11.178505897521973)
      })

      describe('extract()', function() {

        it('parses translation values', function() {
          var extract = new SVG.Matrix(draw.rect(100, 100).translate(40, 50)).extract()
          expect(extract.x).toBeCloseTo(40)
          expect(extract.y).toBeCloseTo(50)
        })
        it('parses skewX value', function() {
          var extract = new SVG.Matrix(draw.rect(100, 100).skew(25, 0)).extract()
          expect(extract.skewX).toBeCloseTo(25)
        })
        it('parses skewY value', function() {
          var extract = new SVG.Matrix(draw.rect(100, 100).skew(0, 20)).extract()
          expect(extract.skewY).toBeCloseTo(20)
        })
        it('parses scale values', function() {
          var extract = new SVG.Matrix(draw.rect(100, 100).scale(2, 3)).extract()
          expect(extract.scaleX).toBeCloseTo(2)
          expect(extract.scaleY).toBeCloseTo(3)
        })
        it('parses rotatoin value', function() {
          var extract = new SVG.Matrix(draw.rect(100, 100).rotate(-100)).extract()
          expect(extract.rotation).toBeCloseTo(-100)
        })

      })

    })

    describe('with a string given', function() {
      it('parses the string value correctly', function() {
        var matrix = new SVG.Matrix('2, 0, 0, 2, 100, 50')

        expect(matrix.a).toBe(2)
        expect(matrix.b).toBe(0)
        expect(matrix.c).toBe(0)
        expect(matrix.d).toBe(2)
        expect(matrix.e).toBe(100)
        expect(matrix.f).toBe(50)
      })
    })

    describe('with an array given', function() {
      it('parses the array correctly', function() {
        var matrix = new SVG.Matrix([2, 0, 0, 2, 100, 50])

        expect(matrix.a).toBe(2)
        expect(matrix.b).toBe(0)
        expect(matrix.c).toBe(0)
        expect(matrix.d).toBe(2)
        expect(matrix.e).toBe(100)
        expect(matrix.f).toBe(50)
      })
    })

    describe('with an object given', function() {
      it('parses the object correctly', function() {
        var matrix = new SVG.Matrix({a:2, b:0, c:0, d:2, e:100, f:50})

        expect(matrix.a).toBe(2)
        expect(matrix.b).toBe(0)
        expect(matrix.c).toBe(0)
        expect(matrix.d).toBe(2)
        expect(matrix.e).toBe(100)
        expect(matrix.f).toBe(50)
      })
    })

    describe('with 6 arguments given', function() {
      it('parses the arguments correctly', function() {
        var matrix = new SVG.Matrix(2, 0, 0, 2, 100, 50)

        expect(matrix.a).toBe(2)
        expect(matrix.b).toBe(0)
        expect(matrix.c).toBe(0)
        expect(matrix.d).toBe(2)
        expect(matrix.e).toBe(100)
        expect(matrix.f).toBe(50)
      })
    })

  })

  describe('clone()', function() {
    it('returns a clone of the matrix', function() {
      var matrix = new SVG.Matrix(2, 0, 0, 5, 0, 0)
        , clone = matrix.clone()
      expect(matrix).not.toBe(clone)
      for(var i in 'abcdef') {
        expect(matrix[i]).toEqual(clone[i])
      }
    })
  })

  describe('morph()', function() {
    it('stores a given matrix for morphing', function() {
      var matrix1 = new SVG.Matrix(2, 0, 0, 5, 0, 0)
        , matrix2 = new SVG.Matrix(1, 0, 0, 1, 4, 3)

      matrix1.morph(matrix2)

      expect(matrix1.destination).toEqual(matrix2)
    })
    it('stores a clone, not the given matrix itself', function() {
      var matrix1 = new SVG.Matrix(2, 0, 0, 5, 0, 0)
        , matrix2 = new SVG.Matrix(1, 0, 0, 1, 4, 3)

      matrix1.morph(matrix2)

      expect(matrix1.destination).not.toBe(matrix2)
    })
  })

  describe('at()', function() {
    it('returns a morphed array at a given position', function() {
      var matrix1 = new SVG.Matrix(2, 0, 0, 5, 0, 0)
        , matrix2 = new SVG.Matrix(1, 0, 0, 1, 4, 3)
        , matrix3 = matrix1.morph(matrix2).at(0.5)

      expect(matrix1.toString()).toBe('matrix(2,0,0,5,0,0)')
      expect(matrix2.toString()).toBe('matrix(1,0,0,1,4,3)')
      expect(matrix3.toString()).toBe('matrix(1.5,0,0,3,2,1.5)')
    })
    it('returns itself when no destination specified', function() {
      var matrix = new SVG.Matrix(2, 0, 0, 5, 0, 0)
      expect(matrix.at(0.5)).toBe(matrix)
    })
  })

  describe('multiply()', function() {
    it('multiplies two matices', function() {
      var matrix1 = new SVG.Matrix(2, 0, 0, 5, 0, 0)
        , matrix2 = new SVG.Matrix(1, 0, 0, 1, 4, 3)
        , matrix3 = matrix1.multiply(matrix2)

      expect(matrix1.toString()).toBe('matrix(2,0,0,5,0,0)')
      expect(matrix2.toString()).toBe('matrix(1,0,0,1,4,3)')
      expect(matrix3.toString()).toBe('matrix(2,0,0,5,8,15)')
    })
    it('accepts matrices in any form', function() {
      var matrix1 = new SVG.Matrix(2, 0, 0, 5, 0, 0)
        , matrix2 = matrix1.multiply('1,0,0,1,4,3')

      expect(matrix1.toString()).toBe('matrix(2,0,0,5,0,0)')
      expect(matrix2.toString()).toBe('matrix(2,0,0,5,8,15)')
    })
  })

  describe('inverse()', function() {
    it('inverses matrix', function() {

      var matrix1 = new SVG.Matrix(2, 0, 0, 5, 4, 3)
        , matrix2 = matrix1.inverse()
        , abcdef = [0.5,0,0,0.2,-2,-0.6]

      expect(matrix1.toString()).toBe('matrix(2,0,0,5,4,3)')

      for(var i in 'abcdef') {
        expect(matrix2['abcdef'[i]]).toBeCloseTo(abcdef[i])
      }
    })
  })

  describe('translate()', function() {
    it('translates matrix by given x and y values', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).translate(10, 12.5)

      expect(matrix.e).toBe(14)
      expect(matrix.f).toBe(15.5)
    })
  })

  describe('scale()', function() {
    it('performs a uniformal scale with one value', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).scale(3)

      expect(matrix.a).toBe(3)
      expect(matrix.d).toBe(3)
      expect(matrix.e).toBe(4)
      expect(matrix.f).toBe(3)
    })
    it('performs a non-uniformal scale with two values', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).scale(2.5, 3.5)

      expect(matrix.a).toBe(2.5)
      expect(matrix.d).toBe(3.5)
      expect(matrix.e).toBe(4)
      expect(matrix.f).toBe(3)
    })
    it('performs a uniformal scale at a given center point with three values', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).scale(3, 150, 100)

      expect(matrix.a).toBe(3)
      expect(matrix.d).toBe(3)
      expect(matrix.e).toBe(-296)
      expect(matrix.f).toBe(-197)
    })
    it('performs a non-uniformal scale at a given center point with four values', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).scale(3, 2, 150, 100)

      expect(matrix.a).toBe(3)
      expect(matrix.d).toBe(2)
      expect(matrix.e).toBe(-296)
      expect(matrix.f).toBe(-97)
    })
  })

  describe('rotate()', function() {
    it('performs a rotation with one argument', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).rotate(30)

      expect(matrix.a).toBeCloseTo(0.8660254037844387)
      expect(matrix.d).toBeCloseTo(0.8660254037844387)
      expect(matrix.e).toBe(4)
      expect(matrix.f).toBe(3)
    })
    it('performs a rotation on a given point with three arguments', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).rotate(30, 150, 100)

      expect(matrix.a).toBeCloseTo(0.8660254037844387)
      expect(matrix.d).toBeCloseTo(0.8660254037844387)
      expect(matrix.e).toBeCloseTo(74.0961894323342)
      expect(matrix.f).toBeCloseTo(-58.60254037844388)
    })
  })

  describe('flip()', function() {
    describe('with x given', function() {
      it('performs a flip over the horizontal axis with one argument', function() {
        var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).flip('x')

        expect(matrix.a).toBe(-1)
        expect(matrix.d).toBe(1)
        expect(matrix.e).toBe(4)
        expect(matrix.f).toBe(3)
      })
      it('performs a flip over the horizontal axis over a given point with two arguments', function() {
        var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).flip('x', 150)

        expect(matrix.a).toBe(-1)
        expect(matrix.d).toBe(1)
        expect(matrix.e).toBe(304)
        expect(matrix.f).toBe(3)
      })
    })
    describe('with y given', function() {
      it('performs a flip over the vertical axis with one argument', function() {
        var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).flip('y')

        expect(matrix.a).toBe(1)
        expect(matrix.d).toBe(-1)
        expect(matrix.e).toBe(4)
        expect(matrix.f).toBe(3)
      })
      it('performs a flip over the vertical axis over a given point with two arguments', function() {
        var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).flip('y', 100)

        expect(matrix.a).toBe(1)
        expect(matrix.d).toBe(-1)
        expect(matrix.e).toBe(4)
        expect(matrix.f).toBe(203)
      })
    })
    describe('with no axis given', function() {
      it('performs a flip over the horizontal and vertical axis with no argument', function() {
        var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).flip()

        expect(matrix.a).toBe(-1)
        expect(matrix.d).toBe(-1)
        expect(matrix.e).toBe(4)
        expect(matrix.f).toBe(3)
      })
      it('performs a flip over the horizontal and vertical axis over a given point with one argument that represent both coordinates', function() {
        var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).flip(100)

        expect(matrix.a).toBe(-1)
        expect(matrix.d).toBe(-1)
        expect(matrix.e).toBe(204)
        expect(matrix.f).toBe(203)
      })
      it('performs a flip over the horizontal and vertical axis over a given point with two arguments', function() {
        var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).flip(50, 100)

        expect(matrix.a).toBe(-1)
        expect(matrix.d).toBe(-1)
        expect(matrix.e).toBe(104)
        expect(matrix.f).toBe(203)
      })
    })
  })

  describe('skew()', function() {
    it('performs a uniformal skew with one value', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).skew(14)

      expect(matrix.a).toBe(1)
      expect(matrix.b).toBeCloseTo(0.24932800284318)
      expect(matrix.c).toBeCloseTo(0.24932800284318)
      expect(matrix.d).toBe(1)
      expect(matrix.e).toBe(4)
      expect(matrix.f).toBe(3)
    })
    it('performs a non-uniformal skew with two values', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).skew(8, 5)

      expect(matrix.a).toBe(1)
      expect(matrix.b).toBeCloseTo(0.087488663525924)
      expect(matrix.c).toBeCloseTo(0.14054083470239)
      expect(matrix.d).toBe(1)
      expect(matrix.e).toBe(4)
      expect(matrix.f).toBe(3)
    })
    it('performs a uniformal skew at a given center point with three values', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).skew(3, 150, 100)

      expect(matrix.a).toBe(1)
      expect(matrix.b).toBeCloseTo(0.052407779283041)
      expect(matrix.c).toBeCloseTo(0.052407779283041)
      expect(matrix.d).toBe(1)
      expect(matrix.e).toBeCloseTo(-1.2407779283)
      expect(matrix.f).toBeCloseTo(-4.8611668924562)
    })
    it('performs a non-uniformal skew at a given center point with four values', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).skew(9, 7, 150, 100)

      expect(matrix.a).toBe(1)
      expect(matrix.b).toBeCloseTo(0.1227845609029)
      expect(matrix.c).toBeCloseTo(0.15838444032454)
      expect(matrix.d).toBe(1)
      expect(matrix.e).toBeCloseTo(-11.83844403245)
      expect(matrix.f).toBeCloseTo(-15.417684135435)
    })
    it('can be chained', function(){
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).skew(9, 7).skew(20, 40)

      expect(matrix.a).toBeCloseTo(1.1329003254605)
      expect(matrix.b).toBeCloseTo(0.96188419208018)
      expect(matrix.c).toBeCloseTo(0.52235467459074)
      expect(matrix.d).toBeCloseTo(1.0446899253961)
      expect(matrix.e).toBe(4)
      expect(matrix.f).toBe(3)
    })
  })

  describe('skewX', function(){
    it('performs a skew along the x axis with one value', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).skewX(12)

      expect(matrix.a).toBe(1)
      expect(matrix.b).toBe(0)
      expect(matrix.c).toBeCloseTo(0.21255656167002)
      expect(matrix.d).toBe(1)
      expect(matrix.e).toBe(4)
      expect(matrix.f).toBe(3)
    })

    it('performs a skew along the x axis at a given center point with three values', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).skewX(5, 150, 100)

      expect(matrix.a).toBe(1)
      expect(matrix.b).toBe(0)
      expect(matrix.c).toBeCloseTo(0.087488663525924)
      expect(matrix.d).toBe(1)
      expect(matrix.e).toBeCloseTo(-4.74886635259)
      expect(matrix.f).toBe(3)
    })
  })

  describe('skewY', function(){
    it('performs a skew along the y axis with one value', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).skewY(12)

      expect(matrix.a).toBe(1)
      expect(matrix.b).toBeCloseTo(0.21255656167002)
      expect(matrix.c).toBe(0)
      expect(matrix.d).toBe(1)
      expect(matrix.e).toBe(4)
      expect(matrix.f).toBe(3)
    })

    it('performs a skew along the y axis at a given center point with three values', function() {
      var matrix = new SVG.Matrix(1, 0, 0, 1, 4, 3).skewY(5, 150, 100)

      expect(matrix.a).toBe(1)
      expect(matrix.b).toBeCloseTo(0.087488663525924)
      expect(matrix.c).toBe(0)
      expect(matrix.d).toBe(1)
      expect(matrix.e).toBe(4)
      expect(matrix.f).toBeCloseTo(-10.123299528889)
    })
  })

  describe('native()', function() {
    it('returns the node reference', function() {
      expect(new SVG.Matrix().native() instanceof window.SVGMatrix).toBeTruthy()
    })
  })

})
