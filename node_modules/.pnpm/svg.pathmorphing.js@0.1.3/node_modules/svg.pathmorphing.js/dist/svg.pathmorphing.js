/*!
* svg.pathmorphing.js - Enables pathmorphing / path animation in svg.js
* @version 0.1.3
*
*
* @copyright (c) 2018 Ulrich-Matthias Schäfer
* @license MIT
*/;
;(function() {
"use strict";

SVG.extend(SVG.PathArray, {
  morph: function(array) {

    var startArr = this.value
      ,  destArr = this.parse(array)

    var startOffsetM = 0
      ,  destOffsetM = 0

    var startOffsetNextM = false
      ,  destOffsetNextM = false

    while(true){
      // stop if there is no M anymore
      if(startOffsetM === false && destOffsetM === false) break

      // find the next M in path array
      startOffsetNextM = findNextM(startArr, startOffsetM === false ? false : startOffsetM+1)
       destOffsetNextM = findNextM( destArr,  destOffsetM === false ? false :  destOffsetM+1)

      // We have to add one M to the startArray
      if(startOffsetM === false){
        var bbox = new SVG.PathArray(result.start).bbox()

        // when the last block had no bounding box we simply take the first M we got
        if(bbox.height == 0 || bbox.width == 0){
          startOffsetM =  startArr.push(startArr[0]) - 1
        }else{
          // we take the middle of the bbox instead when we got one
          startOffsetM = startArr.push( ['M', bbox.x + bbox.width/2, bbox.y + bbox.height/2 ] ) - 1
        }
      }

      // We have to add one M to the destArray
      if( destOffsetM === false){
        var bbox = new SVG.PathArray(result.dest).bbox()

        if(bbox.height == 0 || bbox.width == 0){
          destOffsetM =  destArr.push(destArr[0]) - 1
        }else{
          destOffsetM =  destArr.push( ['M', bbox.x + bbox.width/2, bbox.y + bbox.height/2 ] ) - 1
        }
      }

      // handle block from M to next M
      var result = handleBlock(startArr, startOffsetM, startOffsetNextM, destArr, destOffsetM, destOffsetNextM)

      // update the arrays to their new values
      startArr = startArr.slice(0, startOffsetM).concat(result.start, startOffsetNextM === false ? [] : startArr.slice(startOffsetNextM))
       destArr =  destArr.slice(0,  destOffsetM).concat(result.dest ,  destOffsetNextM === false ? [] :  destArr.slice( destOffsetNextM))

      // update offsets
      startOffsetM = startOffsetNextM === false ? false : startOffsetM + result.start.length
       destOffsetM =  destOffsetNextM === false ? false :  destOffsetM + result.dest.length

    }

    // copy back arrays
    this.value = startArr
    this.destination = new SVG.PathArray()
    this.destination.value = destArr

    return this
  }
})



// sorry for the long declaration
// slices out one block (from M to M) and syncronize it so the types and length match
function handleBlock(startArr, startOffsetM, startOffsetNextM, destArr, destOffsetM, destOffsetNextM, undefined){

  // slice out the block we need
  var startArrTemp = startArr.slice(startOffsetM, startOffsetNextM || undefined)
    ,  destArrTemp =  destArr.slice( destOffsetM,  destOffsetNextM || undefined)

  var i = 0
    , posStart = {pos:[0,0], start:[0,0]}
    , posDest  = {pos:[0,0], start:[0,0]}

  do{

    // convert shorthand types to long form
    startArrTemp[i] = simplyfy.call(posStart, startArrTemp[i])
     destArrTemp[i] = simplyfy.call(posDest ,  destArrTemp[i])

    // check if both shape types match
    // 2 elliptical arc curve commands ('A'), are considered different if the
    // flags (large-arc-flag, sweep-flag) don't match
    if(startArrTemp[i][0] != destArrTemp[i][0] || startArrTemp[i][0] == 'M' ||
        (startArrTemp[i][0] == 'A' &&
          (startArrTemp[i][4] != destArrTemp[i][4] || startArrTemp[i][5] != destArrTemp[i][5])
        )
      ) {

      // if not, convert shapes to beziere
      Array.prototype.splice.apply(startArrTemp, [i, 1].concat(toBeziere.call(posStart, startArrTemp[i])))
       Array.prototype.splice.apply(destArrTemp, [i, 1].concat(toBeziere.call(posDest, destArrTemp[i])))

    } else {

      // only update positions otherwise
      startArrTemp[i] = setPosAndReflection.call(posStart, startArrTemp[i])
       destArrTemp[i] = setPosAndReflection.call(posDest ,  destArrTemp[i])

    }

    // we are at the end at both arrays. stop here
    if(++i == startArrTemp.length && i == destArrTemp.length) break

    // destArray is longer. Add one element
    if(i == startArrTemp.length){
      startArrTemp.push([
        'C',
        posStart.pos[0],
        posStart.pos[1],
        posStart.pos[0],
        posStart.pos[1],
        posStart.pos[0],
        posStart.pos[1],
      ])
    }

    // startArr is longer. Add one element
    if(i == destArrTemp.length){
      destArrTemp.push([
        'C',
        posDest.pos[0],
        posDest.pos[1],
        posDest.pos[0],
        posDest.pos[1],
        posDest.pos[0],
        posDest.pos[1]
      ])
    }


  }while(true)

  // return the updated block
  return {start:startArrTemp, dest:destArrTemp}
}

// converts shorthand types to long form
function simplyfy(val){

  switch(val[0]){
    case 'z': // shorthand line to start
    case 'Z':
      val[0] = 'L'
      val[1] = this.start[0]
      val[2] = this.start[1]
      break
    case 'H': // shorthand horizontal line
      val[0] = 'L'
      val[2] = this.pos[1]
      break
    case 'V': // shorthand vertical line
      val[0] = 'L'
      val[2] = val[1]
      val[1] = this.pos[0]
      break
    case 'T': // shorthand quadratic beziere
      val[0] = 'Q'
      val[3] = val[1]
      val[4] = val[2]
      val[1] = this.reflection[1]
      val[2] = this.reflection[0]
      break
    case 'S': // shorthand cubic beziere
      val[0] = 'C'
      val[6] = val[4]
      val[5] = val[3]
      val[4] = val[2]
      val[3] = val[1]
      val[2] = this.reflection[1]
      val[1] = this.reflection[0]
      break
  }

  return val

}

// updates reflection point and current position
function setPosAndReflection(val){

  var len = val.length

  this.pos = [ val[len-2], val[len-1] ]

  if('SCQT'.indexOf(val[0]) != -1)
    this.reflection = [ 2 * this.pos[0] - val[len-4], 2 * this.pos[1] - val[len-3] ]

  return val
}

// converts all types to cubic beziere
function toBeziere(val){
  var retVal = [val]

  switch(val[0]){
    case 'M': // special handling for M
      this.pos = this.start = [val[1], val[2]]
      return retVal
    case 'L':
      val[5] = val[3] = val[1]
      val[6] = val[4] = val[2]
      val[1] = this.pos[0]
      val[2] = this.pos[1]
      break
    case 'Q':
      val[6] = val[4]
      val[5] = val[3]
      val[4] = val[4] * 1/3 + val[2] * 2/3
      val[3] = val[3] * 1/3 + val[1] * 2/3
      val[2] = this.pos[1] * 1/3 + val[2] * 2/3
      val[1] = this.pos[0] * 1/3 + val[1] * 2/3
      break
    case 'A':
      retVal = arcToBeziere(this.pos, val)
      val = retVal[0]
      break
  }

  val[0] = 'C'
  this.pos = [val[5], val[6]]
  this.reflection = [2 * val[5] - val[3], 2 * val[6] - val[4]]

  return retVal

}

// finds the next position of type M
function findNextM(arr, offset){

  if(offset === false) return false

  for(var i = offset, len = arr.length;i < len;++i){

    if(arr[i][0] == 'M') return i

  }

  return false
}



// Convert an arc segment into equivalent cubic Bezier curves
// Depending on the arc, up to 4 curves might be used to represent it since a
// curve gives a good approximation for only a quarter of an ellipse
// The curves are returned as an array of SVG curve commands:
// [ ['C', x1, y1, x2, y2, x, y] ... ]
function arcToBeziere(pos, val) {
    // Parameters extraction, handle out-of-range parameters as specified in the SVG spec
    // See: https://www.w3.org/TR/SVG11/implnote.html#ArcOutOfRangeParameters
    var rx = Math.abs(val[1]), ry = Math.abs(val[2]), xAxisRotation = val[3] % 360
      , largeArcFlag = val[4], sweepFlag = val[5], x = val[6], y = val[7]
      , A = new SVG.Point(pos), B = new SVG.Point(x, y)
      , primedCoord, lambda, mat, k, c, cSquare, t, O, OA, OB, tetaStart, tetaEnd
      , deltaTeta, nbSectors, f, arcSegPoints, angle, sinAngle, cosAngle, pt, i, il
      , retVal = [], x1, y1, x2, y2

    // Ensure radii are non-zero
    if(rx === 0 || ry === 0 || (A.x === B.x && A.y === B.y)) {
      // treat this arc as a straight line segment
      return [['C', A.x, A.y, B.x, B.y, B.x, B.y]]
    }

    // Ensure radii are large enough using the algorithm provided in the SVG spec
    // See: https://www.w3.org/TR/SVG11/implnote.html#ArcCorrectionOutOfRangeRadii
    primedCoord = new SVG.Point((A.x-B.x)/2, (A.y-B.y)/2).transform(new SVG.Matrix().rotate(xAxisRotation))
    lambda = (primedCoord.x * primedCoord.x) / (rx * rx) + (primedCoord.y * primedCoord.y) / (ry * ry)
    if(lambda > 1) {
      lambda = Math.sqrt(lambda)
      rx = lambda*rx
      ry = lambda*ry
    }

    // To simplify calculations, we make the arc part of a unit circle (rayon is 1) instead of an ellipse
    mat = new SVG.Matrix().rotate(xAxisRotation).scale(1/rx, 1/ry).rotate(-xAxisRotation)
    A = A.transform(mat)
    B = B.transform(mat)

    // Calculate the horizontal and vertical distance between the initial and final point of the arc
    k = [B.x-A.x, B.y-A.y]

    // Find the length of the chord formed by A and B
    cSquare = k[0]*k[0] + k[1]*k[1]
    c = Math.sqrt(cSquare)

    // Calculate the ratios of the horizontal and vertical distance on the length of the chord
    k[0] /= c
    k[1] /= c

    // Calculate the distance between the circle center and the chord midpoint
    // using this formula: t = sqrt(r^2 - c^2 / 4)
    // where t is the distance between the cirle center and the chord midpoint,
    //       r is the rayon of the circle and c is the chord length
    // From: http://www.ajdesigner.com/phpcircle/circle_segment_chord_t.php
    // Because of the imprecision of floating point numbers, cSquare might end
    // up being slightly above 4 which would result in a negative radicand
    // To prevent that, a test is made before computing the square root
    t = (cSquare < 4) ? Math.sqrt(1 - cSquare/4) : 0

    // For most situations, there are actually two different ellipses that
    // satisfy the constraints imposed by the points A and B, the radii rx and ry,
    // and the xAxisRotation
    // When the flags largeArcFlag and sweepFlag are equal, it means that the
    // second ellipse is used as a solution
    // See: https://www.w3.org/TR/SVG/paths.html#PathDataEllipticalArcCommands
    if(largeArcFlag === sweepFlag) {
        t *= -1
    }

    // Calculate the coordinates of the center of the circle from the midpoint of the chord
    // This is done by multiplying the ratios calculated previously by the distance between
    // the circle center and the chord midpoint and using these values to go from the midpoint
    // to the center of the circle
    // The negative of the vertical distance ratio is used to modify the x coordinate while
    // the horizontal distance ratio is used to modify the y coordinate
    // That is because the center of the circle is perpendicular to the chord and perpendicular
    // lines are negative reciprocals
    O = new SVG.Point((B.x+A.x)/2 + t*-k[1], (B.y+A.y)/2 + t*k[0])
    // Move the center of the circle at the origin
    OA = new SVG.Point(A.x-O.x, A.y-O.y)
    OB = new SVG.Point(B.x-O.x, B.y-O.y)

    // Calculate the start and end angle
    tetaStart = Math.acos(OA.x/Math.sqrt(OA.x*OA.x + OA.y*OA.y))
    if (OA.y < 0) {
      tetaStart *= -1
    }
    tetaEnd = Math.acos(OB.x/Math.sqrt(OB.x*OB.x + OB.y*OB.y))
    if (OB.y < 0) {
      tetaEnd *= -1
    }

    // If sweep-flag is '1', then the arc will be drawn in a "positive-angle" direction,
    // make sure that the end angle is above the start angle
    if (sweepFlag && tetaStart > tetaEnd) {
      tetaEnd += 2*Math.PI
    }
    // If sweep-flag is '0', then the arc will be drawn in a "negative-angle" direction,
    // make sure that the end angle is below the start angle
    if (!sweepFlag && tetaStart < tetaEnd) {
      tetaEnd -= 2*Math.PI
    }

    // Find the number of Bezier curves that are required to represent the arc
    // A cubic Bezier curve gives a good enough approximation when representing at most a quarter of a circle
    nbSectors = Math.ceil(Math.abs(tetaStart-tetaEnd) * 2/Math.PI)

    // Calculate the coordinates of the points of all the Bezier curves required to represent the arc
    // For an in-depth explanation of this part see: http://pomax.github.io/bezierinfo/#circles_cubic
    arcSegPoints = []
    angle = tetaStart
    deltaTeta = (tetaEnd-tetaStart)/nbSectors
    f = 4*Math.tan(deltaTeta/4)/3
    for (i = 0; i <= nbSectors; i++) { // The <= is because a Bezier curve have a start and a endpoint
      cosAngle = Math.cos(angle)
      sinAngle = Math.sin(angle)

      pt = new SVG.Point(O.x+cosAngle, O.y+sinAngle)
      arcSegPoints[i] = [new SVG.Point(pt.x+f*sinAngle, pt.y-f*cosAngle), pt, new SVG.Point(pt.x-f*sinAngle, pt.y+f*cosAngle)]

      angle += deltaTeta
    }

    // Remove the first control point of the first segment point and remove the second control point of the last segment point
    // These two control points are not used in the approximation of the arc, that is why they are removed
    arcSegPoints[0][0] = arcSegPoints[0][1].clone()
    arcSegPoints[arcSegPoints.length-1][2] = arcSegPoints[arcSegPoints.length-1][1].clone()

    // Revert the transformation that was applied to make the arc part of a unit circle instead of an ellipse
    mat = new SVG.Matrix().rotate(xAxisRotation).scale(rx, ry).rotate(-xAxisRotation)
    for (i = 0, il = arcSegPoints.length; i < il; i++) {
      arcSegPoints[i][0] = arcSegPoints[i][0].transform(mat)
      arcSegPoints[i][1] = arcSegPoints[i][1].transform(mat)
      arcSegPoints[i][2] = arcSegPoints[i][2].transform(mat)
    }


    // Convert the segments points to SVG curve commands
    for (i = 1, il = arcSegPoints.length; i < il; i++) {
      pt = arcSegPoints[i-1][2]
      x1 = pt.x
      y1 = pt.y

      pt = arcSegPoints[i][0]
      x2 = pt.x
      y2 = pt.y

      pt = arcSegPoints[i][1]
      x = pt.x
      y = pt.y

      retVal.push(['C', x1, y1, x2, y2, x, y])
    }

    return retVal
}
}());
