// create canavs
//var drawing, window = window, document = document, SVG = SVG

parserInDoc = false

if(typeof exports === 'object'){
  window = require('svgdom')
  SVG = require('../../dist/svg.js')
  document = window.document
  drawing = document.documentElement
  imageUrl = 'spec/fixtures/pixel.png'
  parserInDoc = true
  
  function tag(name, attrs, children) {
    var el = document.createElement(name)
    for(var i in attrs){
      el.setAttribute(i, attrs[i])
    }
    
    for(var i in children){
      if(typeof children[i] == 'string')
        children[i] = document.createTextNode(children[i])
        
      el.appendChild(children[i])
    }
    
    return el
  }
  
  // create fixtures in svgdom
  var el = tag('svg', {
    height:0,
    width:0,
    id:'inlineSVG'
  },[
    tag('defs', {}, [
      tag('linearGradient', {}, [
        tag('stop', {offset: '5%',  'stop-color': 'green'}),
        tag('stop', {offset: '95%', 'stop-color': 'gold'}),
      ]),
      tag('radialGradient', {}, [
        tag('stop', {offset: '5%',  'stop-color': 'green'}),
        tag('stop', {offset: '95%', 'stop-color': 'gold'}),
      ])
    ]),
    tag('desc', {}, ['Some description']),
    tag('path', {
      id: 'lineAB',
      d: 'M 100 350 l 150 -300',
      stroke: 'red',
      'stroke-width': '3',
      fill: 'none'
    }),
    tag('path', {
      id: 'lineBC',
      d: 'M 250 50 l 150 300',
      stroke: 'red',
      'stroke-width': '3',
      fill: 'none'
    }),
    tag('path', {
      d: 'M 175 200 l 150 0',
      stroke: 'green',
      'stroke-width': '3',
      fill: 'none'
    }),
    tag('path', {
      d: 'M 100 350 q 150 -300 300 0',
      stroke: 'blue',
      'stroke-width': '5',
      fill: 'none'
    }),
    tag('g', {
      stroke: 'black',
      'stroke-width': '2',
      fill: 'black',
      id: 'pointGroup'
    },[
      tag('circle', {
        id: 'pointA',
        cx: '100',
        cy: '350',
        r: '3',
      }),
      tag('circle', {
        id: 'pointB',
        cx: '250',
        cy: '50',
        r: '50',
      }),
      tag('circle', {
        id: 'pointC',
        cx: '400',
        cy: '350',
        r: '50',
      })
    ]),
    tag('g', {
      'font-size': '30',
      font: 'sans-serif',
      fill: 'black',
      stroke: 'none',
      'text-anchor': 'middle',
      id: 'labelGroup'
    },[
      tag('text', {
        x: '100',
        y: '350',
        dy: '-30',
      }, ['A']),
      tag('text', {
        x: '250',
        y: '50',
        dy: '-10',
      }, ['B']),
      tag('text', {
        x: '400',
        y: '350',
        dx: '30',
      }, ['C'])
    ]),
    tag('polygon', {points: '200,10 250,190 160,210'}),
    tag('polyline', {points: '20,20 40,25 60,40 80,120 120,140 200,180'})
  ])
  
  document.appendChild(el)
  
}else{
  drawing = document.createElement('div')
  document.getElementsByTagName('body')[0].appendChild(drawing)
  imageUrl = 'fixtures/pixel.png'
}

parserInDoc |= 0
drawing.id = 'drawing'
draw = SVG(drawing).size(100,100)

parser = parserInDoc ? [SVG.parser.draw.instance] : []

// raw path data
svgPath = 'M88.006,61.994c3.203,0,6.216-1.248,8.481-3.514C98.752,56.215,100,53.203,100,50c0-3.204-1.248-6.216-3.513-8.481 c-2.266-2.265-5.278-3.513-8.481-3.513c-2.687,0-5.237,0.877-7.327,2.496h-7.746l5.479-5.479 c5.891-0.757,10.457-5.803,10.457-11.896c0-6.614-5.381-11.995-11.994-11.995c-6.093,0-11.14,4.567-11.896,10.457l-5.479,5.479 v-7.747c1.618-2.089,2.495-4.641,2.495-7.327c0-3.204-1.247-6.216-3.513-8.481C56.216,1.248,53.204,0,50,0 c-3.204,0-6.216,1.248-8.481,3.513c-2.265,2.265-3.513,5.277-3.513,8.481c0,2.686,0.877,5.237,2.495,7.327v7.747l-5.479-5.479 c-0.757-5.89-5.803-10.457-11.896-10.457c-6.614,0-11.995,5.381-11.995,11.995c0,6.093,4.567,11.139,10.458,11.896l5.479,5.479 h-7.747c-2.089-1.619-4.641-2.496-7.327-2.496c-3.204,0-6.216,1.248-8.481,3.513C1.248,43.784,0,46.796,0,50 c0,3.203,1.248,6.216,3.513,8.48c2.265,2.266,5.277,3.514,8.481,3.514c2.686,0,5.237-0.877,7.327-2.496h7.747l-5.479,5.479 c-5.891,0.757-10.458,5.804-10.458,11.896c0,6.614,5.381,11.994,11.995,11.994c6.093,0,11.139-4.566,11.896-10.457l5.479-5.479 v7.749c-3.63,4.7-3.291,11.497,1.018,15.806C43.784,98.752,46.796,100,50,100c3.204,0,6.216-1.248,8.481-3.514 c4.309-4.309,4.647-11.105,1.018-15.806v-7.749l5.479,5.479c0.757,5.891,5.804,10.457,11.896,10.457 c6.613,0,11.994-5.38,11.994-11.994c0-6.093-4.566-11.14-10.457-11.896l-5.479-5.479h7.746 C82.769,61.117,85.319,61.994,88.006,61.994z M76.874,68.354c4.705,0,8.52,3.814,8.52,8.521c0,4.705-3.814,8.52-8.52,8.52 s-8.52-3.814-8.52-8.52l-12.33-12.33V81.98c3.327,3.328,3.327,8.723,0,12.049c-3.327,3.328-8.722,3.328-12.049,0 c-3.327-3.326-3.327-8.721,0-12.049V64.544l-12.33,12.33c0,4.705-3.814,8.52-8.52,8.52s-8.52-3.814-8.52-8.52 c0-4.706,3.814-8.521,8.52-8.521l12.33-12.33H18.019c-3.327,3.328-8.722,3.328-12.049,0c-3.327-3.326-3.327-8.721,0-12.048 s8.722-3.327,12.049,0h17.438l-12.33-12.33c-4.706,0-8.52-3.814-8.52-8.52c0-4.706,3.814-8.52,8.52-8.52s8.52,3.814,8.52,8.52 l12.33,12.33V18.019c-3.327-3.327-3.327-8.722,0-12.049s8.722-3.327,12.049,0s3.327,8.722,0,12.049v17.438l12.33-12.33 c0-4.706,3.814-8.52,8.52-8.52s8.52,3.814,8.52,8.52c0,4.705-3.814,8.52-8.52,8.52l-12.33,12.33h17.438 c3.327-3.327,8.722-3.327,12.049,0s3.327,8.722,0,12.048c-3.327,3.328-8.722,3.328-12.049,0H64.544L76.874,68.354z'

// image url


// lorem ipsum text
loremIpsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras sodales\n imperdiet auctor. Nunc ultrices lectus at erat dictum pharetra\n elementum ante posuere. Duis turpis risus, blandit nec elementum et,\n posuere eget lacus. Aliquam et risus magna, eu aliquet nibh. Fusce\n consequat mi quis purus varius sagittis euismod urna interdum.\n Curabitur aliquet orci quis felis semper vulputate. Vestibulum ac nisi\n magna, id dictum diam. Proin sed metus vel magna blandit\n sodales. Pellentesque at neque ultricies nunc euismod rutrum ut in\n lorem. Mauris euismod tellus in tellus tempus interdum. Phasellus\n mattis sapien et leo feugiat dictum. Vestibulum at volutpat velit.'

beforeEach(function(){
  // test for touch device
  this.isTouchDevice = 'ontouchstart' in document.documentElement
})

// strip spaces from result
window.stripped = function(string) {
  string = string.replace(/\s+/g, '')
  if(string.slice(-1) == ';') string = string.slice(0, -1)
  return string
}

// This is needed because of IE11 which uses space as a delimiter in matrix
window.matrixStringToArray = function(source){
  return source
    .replace(/matrix\(|\)/, '')
    .split(SVG.regex.delimiter)
    .map(parseFloat)
}

// This is needed because of IE11 creating values like 2.99999 when calculating a transformed box
window.roundBox = function(box) {
  return new SVG.Box(
    Math.round(box.x),
    Math.round(box.y),
    Math.round(box.width),
    Math.round(box.height)
  )
}
