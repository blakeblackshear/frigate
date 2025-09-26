;( function() {

  SVG.bench = {
    // Initalize test store
    _chain:  []
  , _before: function() {}
  , _after:  function() {}
  , draw:    SVG('draw')
  , snap:    Snap(100, 100)
  , raw:     document.getElementById('native')

    // Add descriptor
  , describe: function(name, closure) {
      this._chain.push({
        name: name
      , run:  closure
      })

      return this
    }

    // Add test
  , test: function(name, run) {
      // run test
      var start = ( new Date ).getTime()
      run()
      this.write( name, ( new Date ).getTime() - start )

      // clear everything
      this.clear()
    }

    // Skip test
  , skip: function(name, run) {
      this.write( name, false )
    }

    // Run tests
  , run: function() {
      this.pad()
      
      for (var h, i = 0, il = this._chain.length; i < il; i++) {
        var h = document.createElement('h1')
        h.innerHTML = this._chain[i].name

        this.pad().appendChild(h)

        this._chain[i].run(this)
      }
    }
    
    // Write result
  , write: function(name, ms) {
      var test = document.createElement('div')

      if (typeof ms === 'number') {
        test.className = 'test'
        test.innerHTML = '<span class="name">' + name + '</span> completed in <span class="ms">' + ms + 'ms</span>'
      } else {
        test.className = 'test skipped'
        test.innerHTML = name + ' (skipped)'
      }
      
      this.pad().appendChild(test)

      return this
    }

    // Reference writable element
  , pad: function() {
      var pad = document.getElementById('pad')

      if (!pad) {
        pad = document.createElement('div')
        document.getElementsByTagName('body')[0].appendChild(pad)
      }

      return pad
    }

    // Clear canvasses
  , clear: function() {
      while(this.raw.hasChildNodes())
        this.raw.removeChild(this.raw.lastChild)
      this.draw.clear()
      this.snap.clear()
    }
  }

})();