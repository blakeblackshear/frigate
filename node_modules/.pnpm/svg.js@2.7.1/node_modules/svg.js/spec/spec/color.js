describe('Color', function() {
	var color

	beforeEach(function() {
		color = new SVG.Color({ r: 0, g: 102, b: 255 })
	})

	it('correclty parses a rgb string', function() {
		color = new SVG.Color('rgb(255,0,128)')
		expect(color.r).toBe(255)
		expect(color.g).toBe(0)
		expect(color.b).toBe(128)
	})
	
	it('correclty parses a 3 digit hex string', function() {
		color = new SVG.Color('#f06')
		expect(color.r).toBe(255)
		expect(color.g).toBe(0)
		expect(color.b).toBe(102)
	})

	it('correclty parses a 6 digit hex string', function() {
		color = new SVG.Color('#0066ff')
		expect(color.r).toBe(0)
		expect(color.g).toBe(102)
		expect(color.b).toBe(255)
	})

	describe('toHex()', function() {
		it('returns a hex color', function() {
			expect(color.toHex()).toBe('#0066ff')
		})
	})

	describe('toRgb()', function() {
		it('returns a rgb string color', function() {
			expect(color.toRgb()).toBe('rgb(0,102,255)')
		})
	})

	describe('brightness()', function() {
		it('returns the percieved brightness value of a color', function() {
			expect(color.brightness()).toBe(0.346)
		})
	})

	describe('morph()', function() {
		it('prepares the color for morphing', function() {
			var destination = new SVG.Color
			color.morph(destination)
			expect(color.destination).toEqual(destination)
		})
	})

	describe('at()', function() {
		it('morphes color to a given position', function() {
			var destination = new SVG.Color
			var morphed = color.morph(destination).at(0.5)
			expect(morphed.r).toBe(0)
			expect(morphed.g).toBe(51)
			expect(morphed.b).toBe(127)
		})

		it('morphes color to 1 with higher values', function() {
			var destination = new SVG.Color('#fff')
			var morphed = color.morph(destination).at(2)
			expect(morphed.r).toBe(255)
			expect(morphed.g).toBe(255)
			expect(morphed.b).toBe(255)
		})

		it('morphes color to 0 with lower values', function() {
			var destination = new SVG.Color('#fff')
			var morphed = color.morph(destination).at(-3)
			expect(morphed.r).toBe(0)
			expect(morphed.g).toBe(102)
			expect(morphed.b).toBe(255)
		})
    
    it('returns itself when no destination specified', function() {
      expect(color.at(0.5)).toBe(color)
    })
	})

})

