describe('Transformations:', function() {
  var translated, scaled, rotated, skewed

  beforeEach(function() {
    translated = draw.rect(100,100).translate(100,100)
    scaled = draw.rect(100,100).scale(2)
    rotated = draw.rect(100,100).rotate(45, 50, 50)
    skewed = draw.rect(100,100).skew(30)
  })

  /* SVG.Transformation is not tested because it is an abstract prototype */

  describe('SVG.Transformation', function() {
    it('marks the transformation as inversed when inverse flag given', function() {
      var trans = new SVG.Transformation([], true)
      expect(trans.inversed).toBeTruthy()
    })
  })

  describe('SVG.Translate', function() {
    var trans
    
    beforeEach(function(){
      trans = new SVG.Translate(translated.transform())
    })
  

    it('creates an object of type SVG.Transformation', function() {
      expect(trans instanceof SVG.Transformation).toBeTruthy()
    })

    it('uses transformedX and transformedY as arguments', function() {
      expect(trans.arguments).toEqual(['transformedX', 'transformedY'])
    })

    it('s method is translate()', function() {
      expect(trans.method).toEqual('translate')
    })

    it('sets the necessary parameters at creation', function() {
      expect(trans.transformedX).toBe(100)
      expect(trans.transformedY).toBe(100)
    })

    describe('undo', function() {
      it('sets the undo matrix which can undo the translation', function() {
        var extracted = (new SVG.Matrix(1,0,0,1,20,20)).extract()
        trans.undo(extracted)
        expect(trans._undo.toString()).toEqual('matrix(1,0,0,1,-20,-20)')

        var extracted = (new SVG.Matrix(10,0,0,10,20,20)).extract()
        trans.undo(extracted)
        expect(trans._undo.toString()).toEqual('matrix(1,0,0,1,-2,-2)')
        
        var extracted = (new SVG.Matrix(10,50,50,30,20,20)).extract()
        trans.undo(extracted)
        expect(trans._undo.e).toBeCloseTo(-extracted.transformedX)
        expect(trans._undo.f).toBeCloseTo(-extracted.transformedY)
      })
    })

    describe('at', function() {
      it('creates a matrix at a certain position', function() {
        expect(trans.at(0.3).toString()).toEqual('matrix(1,0,0,1,30,30)')
      })
      it('returns the inversed matrix from a specific position when created with inverse flag', function() {
        expect((new SVG.Translate(translated.transform(), true)).at(0.3).toString()).toEqual('matrix(1,0,0,1,-30,-30)')
      })
      it('returns the resulting transformation which has to be made to set an absolute translation', function() {
        trans.undo(new SVG.Matrix(10,50,50,30,20,20).extract())

        expect(trans.at(0.4).a).toEqual(1)
        expect(trans.at(0.4).b).toEqual(0)
        expect(trans.at(0.4).c).toEqual(0)
        expect(trans.at(0.4).d).toEqual(1)
        expect(trans.at(0.4).e).toBeCloseTo(100 * 0.4 + trans._undo.e * 0.4)
        expect(trans.at(0.4).f).toBeCloseTo(100 * 0.4 + trans._undo.f * 0.4)
      })
    })
  })
  
  describe('SVG.Rotate', function() {
    var trans
    
    beforeEach(function(){
      trans = new SVG.Rotate(45, 50, 50)
    })
  

    it('creates an object of type SVG.Transformation', function() {
      expect(trans instanceof SVG.Transformation).toBeTruthy()
    })

    it('uses rotation, cx and cy as arguments', function() {
      expect(trans.arguments).toEqual(['rotation', 'cx', 'cy'])
    })

    it('s method is rotate()', function() {
      expect(trans.method).toEqual('rotate')
    })

    it('sets the necessary parameters at creation', function() {
      expect(trans.rotation).toBe(45)
      expect(trans.cx).toBe(50)
      expect(trans.cy).toBe(50)
    })

    describe('undo', function() {
      it('sets an undo object which holds rotation', function() {
        var extracted = (new SVG.Matrix(1,0,0,1,0,0)).rotate(20, 50, 50).extract()
        trans.undo(extracted)
        expect(trans._undo.rotation).toBeCloseTo(20)
      })
    })

    describe('at', function() {
      it('creates a matrix at a certain position', function() {
        expect(trans.at(0.3).toString()).toEqual((new SVG.Matrix()).rotate(0.3 * 45, 50, 50).toString())
      })
      it('returns the resulting transformation which has to be made to set an absolute translation', function() {
        trans.undo((new SVG.Matrix()).rotate(20, 50, 50).extract())

        expect(trans.at(0.4).a).toBeCloseTo(1,1)
        expect(trans.at(0.4).b).toEqual(jasmine.any(Number))
        expect(trans.at(0.4).c).toEqual(jasmine.any(Number))
        expect(trans.at(0.4).d).toBeCloseTo(1,1)
        expect(trans.at(0.4).e).toEqual(jasmine.any(Number))
        expect(trans.at(0.4).f).toEqual(jasmine.any(Number))
      })
    })
  })
  

  describe('SVG.Scale', function() {
    var trans
    
    beforeEach(function(){
      trans = new SVG.Scale(2,2,50,50)
    })
  

    it('creates an object of type SVG.Transformation', function() {
      expect(trans instanceof SVG.Transformation).toBeTruthy()
    })

    it('uses scaleX, scaleY, cx and cy as arguments', function() {
      expect(trans.arguments).toEqual(['scaleX', 'scaleY', 'cx', 'cy'])
    })

    it('s method is scale()', function() {
      expect(trans.method).toEqual('scale')
    })

    it('sets the necessary parameters at creation', function() {
      expect(trans.scaleX).toBe(2)
      expect(trans.scaleY).toBe(2)
      expect(trans.cx).toBe(50)
      expect(trans.cy).toBe(50)
    })

    describe('undo', function() {
      it('sets the undo matrix which can undo the translation', function() {
        var extracted = (new SVG.Matrix(4,0,0,4,0,0)).extract()
        trans.undo(extracted)
        expect(trans._undo.toString()).toEqual('matrix(0.25,0,0,0.25,37.5,37.5)')

        var extracted = (new SVG.Matrix(10,0,0,10,20,20)).extract()
        trans.undo(extracted)
        expect(trans._undo.a).toBeCloseTo(1/extracted.scaleX)
        expect(trans._undo.d).toBeCloseTo(1/extracted.scaleY)
        expect(trans._undo.e).toBeCloseTo(45)
        expect(trans._undo.f).toBeCloseTo(45)
        
        var extracted = (new SVG.Matrix(10,50,50,30,20,20)).extract()
        trans.undo(extracted)
        expect(trans._undo.a).toBeCloseTo(1/extracted.scaleX)
        expect(trans._undo.d).toBeCloseTo(1/extracted.scaleY)
      })
    })

    describe('at', function() {
      it('creates a matrix at a certain position', function() {
        expect(trans.at(0.75).toString()).toEqual('matrix(1.75,0,0,1.75,-37.5,-37.5)')
      })
      it('returns the inversed matrix from a specific position when created with inverse flag', function() {
        var morphed = (new SVG.Scale(scaled.transform(2,2,50,50), true)).at(0.25)
        
        expect(morphed.a).toBeCloseTo(0.8)
        expect(morphed.d).toBeCloseTo(0.8)
      })
      it('returns the resulting transformation which has to be made to set an absolute translation', function() {
        
        var morphed = trans.undo((new SVG.Matrix(10,0,0,10,0,0)).extract()).at(0.5)

        expect(morphed.a).toBeCloseTo(0.6)
        expect(morphed.b).toEqual(0)
        expect(morphed.c).toEqual(0)
        expect(morphed.d).toBeCloseTo(0.6)
        expect(morphed.e).toBeCloseTo(20)
        expect(morphed.f).toBeCloseTo(20)
      })
    })
  })  

  describe('SVG.Skew', function() {
    var trans
    
    beforeEach(function(){
      trans = new SVG.Skew(30,-30,50,50)
    })
  

    it('creates an object of type SVG.Transformation', function() {
      expect(trans instanceof SVG.Transformation).toBeTruthy()
    })

    it('uses scaleX, scaleY, cx and cy as arguments', function() {
      expect(trans.arguments).toEqual(['skewX', 'skewY', 'cx', 'cy'])
    })

    it('s method is skew()', function() {
      expect(trans.method).toEqual('skew')
    })

    it('sets the necessary parameters at creation', function() {
      expect(trans.skewX).toBe(30)
      expect(trans.skewY).toBe(-30)
      expect(trans.cx).toBe(50)
      expect(trans.cy).toBe(50)
    })

    describe('undo', function() {
      it('sets the undo matrix which can undo the translation', function() {
        var extracted = (new SVG.Matrix()).skew(90, 90, 0, 0).extract()
        trans.undo(extracted)
        expect(trans._undo.a).toBeCloseTo(0)
        expect(trans._undo.b).toBeCloseTo(0)
        expect(trans._undo.c).toBeCloseTo(0)
        expect(trans._undo.d).toBeCloseTo(0)
        expect(trans._undo.e).toBeCloseTo(50)
        expect(trans._undo.f).toBeCloseTo(50)

        var extracted = (new SVG.Matrix(10,0,0,10,20,20)).extract()
        trans.undo(extracted)
        expect(trans._undo.a).toBeCloseTo(1)
        expect(trans._undo.b).toBeCloseTo(0)
        expect(trans._undo.c).toBeCloseTo(0)
        expect(trans._undo.d).toBeCloseTo(1)
        expect(trans._undo.e).toBeCloseTo(0)
        expect(trans._undo.f).toBeCloseTo(0)
      })
    })

    describe('at', function() {
      it('creates a matrix at a certain position', function() {
        expect(trans.at(0.75)).toEqual((new SVG.Matrix()).morph((new SVG.Matrix()).skew(30, -30, 50, 50)).at(0.75))
      })
      it('returns the inversed matrix from a specific position when created with inverse flag', function() {
        var morphed = (new SVG.Scale(skewed.transform(20,-20,50,50), true)).at(0.25)
        
        expect(morphed.a).toBeCloseTo(0.963)
        expect(morphed.b).toBeCloseTo(0)
        expect(morphed.c).toBeCloseTo(0)
        expect(morphed.d).toBeCloseTo(0.963)
        expect(morphed.e).toBeCloseTo(0)
        expect(morphed.f).toBeCloseTo(0)
      })
      it('returns the resulting transformation which has to be made to set an absolute translation', function() {
        
        var morphed = trans.undo((new SVG.Matrix(10,0,0,10,0,0)).skew(20, 30, 20, 10).extract()).at(0.5)

        expect(morphed.a).toBeCloseTo(1.266)
        expect(morphed.b).toBeCloseTo(-0.7310)
        expect(morphed.c).toBeCloseTo(0.1351)
        expect(morphed.d).toBeCloseTo(0.9220)
        expect(morphed.e).toBeCloseTo(-20.05593)
        expect(morphed.f).toBeCloseTo(40.4468)
      })
    })
  })

})
