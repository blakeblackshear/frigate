/**
 * This class maintains a list of static geometry related utility methods.
 *
 *
 * Copyright: i-Vis Research Group, Bilkent University, 2007 - present
 */

const Point = require('./Point');

function IGeometry() {

}

/**
 * This method calculates *half* the amount in x and y directions of the two
 * input rectangles needed to separate them keeping their respective
 * positioning, and returns the result in the input array. An input
 * separation buffer added to the amount in both directions. We assume that
 * the two rectangles do intersect.
 */
IGeometry.calcSeparationAmount = function (rectA, rectB, overlapAmount, separationBuffer)
{
  if (!rectA.intersects(rectB)) {
    throw "assert failed";
  }

  let directions = new Array(2);

  this.decideDirectionsForOverlappingNodes(rectA, rectB, directions);

  overlapAmount[0] = Math.min(rectA.getRight(), rectB.getRight()) -
      Math.max(rectA.x, rectB.x);
  overlapAmount[1] = Math.min(rectA.getBottom(), rectB.getBottom()) -
      Math.max(rectA.y, rectB.y);

  // update the overlapping amounts for the following cases:
  if ((rectA.getX() <= rectB.getX()) && (rectA.getRight() >= rectB.getRight()))
  {
    /* Case x.1:
    *
    * rectA
    * 	|                       |
    * 	|        _________      |
    * 	|        |       |      |
    * 	|________|_______|______|
    * 			 |       |
    *           |       |
    *        rectB
    */
    overlapAmount[0] += Math.min((rectB.getX() - rectA.getX()),
        (rectA.getRight() - rectB.getRight()));
  }
  else if ((rectB.getX() <= rectA.getX()) && (rectB.getRight() >= rectA.getRight()))
  {
    /* Case x.2:
    *
    * rectB
    * 	|                       |
    * 	|        _________      |
    * 	|        |       |      |
    * 	|________|_______|______|
    * 			 |       |
    *           |       |
    *        rectA
    */
    overlapAmount[0] += Math.min((rectA.getX() - rectB.getX()),
        (rectB.getRight() - rectA.getRight()));
  }
  if ((rectA.getY() <= rectB.getY()) && (rectA.getBottom() >= rectB.getBottom()))
  {
    /* Case y.1:
     *          ________ rectA
     *         |
     *         |
     *   ______|____  rectB
     *         |    |
     *         |    |
     *   ______|____|
     *         |
     *         |
     *         |________
     *
     */
    overlapAmount[1] += Math.min((rectB.getY() - rectA.getY()),
        (rectA.getBottom() - rectB.getBottom()));
  }
  else if ((rectB.getY() <= rectA.getY()) && (rectB.getBottom() >= rectA.getBottom()))
  {
    /* Case y.2:
    *          ________ rectB
    *         |
    *         |
    *   ______|____  rectA
    *         |    |
    *         |    |
    *   ______|____|
    *         |
    *         |
    *         |________
    *
 */
    overlapAmount[1] += Math.min((rectA.getY() - rectB.getY()),
        (rectB.getBottom() - rectA.getBottom()));
  }

  // find slope of the line passes two centers
  let slope = Math.abs((rectB.getCenterY() - rectA.getCenterY()) /
      (rectB.getCenterX() - rectA.getCenterX()));
  // if centers are overlapped
  if ((rectB.getCenterY() === rectA.getCenterY()) &&
      (rectB.getCenterX() === rectA.getCenterX()))
  {
    // assume the slope is 1 (45 degree)
    slope = 1.0;
  }

  let moveByY = slope * overlapAmount[0];
  let moveByX = overlapAmount[1] / slope;
  if (overlapAmount[0] < moveByX)
  {
    moveByX = overlapAmount[0];
  }
  else
  {
    moveByY = overlapAmount[1];
  }
  // return half the amount so that if each rectangle is moved by these
  // amounts in opposite directions, overlap will be resolved
  overlapAmount[0] = -1 * directions[0] * ((moveByX / 2) + separationBuffer);
  overlapAmount[1] = -1 * directions[1] * ((moveByY / 2) + separationBuffer);
};

/**
 * This method decides the separation direction of overlapping nodes
 *
 * if directions[0] = -1, then rectA goes left
 * if directions[0] = 1,  then rectA goes right
 * if directions[1] = -1, then rectA goes up
 * if directions[1] = 1,  then rectA goes down
 */
IGeometry.decideDirectionsForOverlappingNodes = function (rectA, rectB, directions)
{
  if (rectA.getCenterX() < rectB.getCenterX())
  {
    directions[0] = -1;
  }
  else
  {
    directions[0] = 1;
  }

  if (rectA.getCenterY() < rectB.getCenterY())
  {
    directions[1] = -1;
  }
  else
  {
    directions[1] = 1;
  }
};

/**
 * This method calculates the intersection (clipping) points of the two
 * input rectangles with line segment defined by the centers of these two
 * rectangles. The clipping points are saved in the input double array and
 * whether or not the two rectangles overlap is returned.
 */
IGeometry.getIntersection2 = function(rectA, rectB, result)
{
  //result[0-1] will contain clipPoint of rectA, result[2-3] will contain clipPoint of rectB
  let p1x = rectA.getCenterX();
  let p1y = rectA.getCenterY();
  let p2x = rectB.getCenterX();
  let p2y = rectB.getCenterY();

  //if two rectangles intersect, then clipping points are centers
  if (rectA.intersects(rectB))
  {
    result[0] = p1x;
    result[1] = p1y;
    result[2] = p2x;
    result[3] = p2y;
    return true;
  }
  //variables for rectA
  let topLeftAx = rectA.getX();
  let topLeftAy = rectA.getY();
  let topRightAx = rectA.getRight();
  let bottomLeftAx = rectA.getX();
  let bottomLeftAy = rectA.getBottom();
  let bottomRightAx = rectA.getRight();
  let halfWidthA = rectA.getWidthHalf();
  let halfHeightA = rectA.getHeightHalf();
  //variables for rectB
  let topLeftBx = rectB.getX();
  let topLeftBy = rectB.getY();
  let topRightBx = rectB.getRight();
  let bottomLeftBx = rectB.getX();
  let bottomLeftBy = rectB.getBottom();
  let bottomRightBx = rectB.getRight();
  let halfWidthB = rectB.getWidthHalf();
  let halfHeightB = rectB.getHeightHalf();

  //flag whether clipping points are found
  let clipPointAFound = false;
  let clipPointBFound = false;

  // line is vertical
  if (p1x === p2x)
  {
    if (p1y > p2y)
    {
      result[0] = p1x;
      result[1] = topLeftAy;
      result[2] = p2x;
      result[3] = bottomLeftBy;
      return false;
    }
    else if (p1y < p2y)
    {
      result[0] = p1x;
      result[1] = bottomLeftAy;
      result[2] = p2x;
      result[3] = topLeftBy;
      return false;
    }
    else
    {
      //not line, return null;
    }
  }
  // line is horizontal
  else if (p1y === p2y)
  {
    if (p1x > p2x)
    {
      result[0] = topLeftAx;
      result[1] = p1y;
      result[2] = topRightBx;
      result[3] = p2y;
      return false;
    }
    else if (p1x < p2x)
    {
      result[0] = topRightAx;
      result[1] = p1y;
      result[2] = topLeftBx;
      result[3] = p2y;
      return false;
    }
    else
    {
      //not valid line, return null;
    }
  }
  else
  {
    //slopes of rectA's and rectB's diagonals
    let slopeA = rectA.height / rectA.width;
    let slopeB = rectB.height / rectB.width;

    //slope of line between center of rectA and center of rectB
    let slopePrime = (p2y - p1y) / (p2x - p1x);
    let cardinalDirectionA;
    let cardinalDirectionB;
    let tempPointAx;
    let tempPointAy;
    let tempPointBx;
    let tempPointBy;

    //determine whether clipping point is the corner of nodeA
    if ((-slopeA) === slopePrime)
    {
      if (p1x > p2x)
      {
        result[0] = bottomLeftAx;
        result[1] = bottomLeftAy;
        clipPointAFound = true;
      }
      else
      {
        result[0] = topRightAx;
        result[1] = topLeftAy;
        clipPointAFound = true;
      }
    }
    else if (slopeA === slopePrime)
    {
      if (p1x > p2x)
      {
        result[0] = topLeftAx;
        result[1] = topLeftAy;
        clipPointAFound = true;
      }
      else
      {
        result[0] = bottomRightAx;
        result[1] = bottomLeftAy;
        clipPointAFound = true;
      }
    }

    //determine whether clipping point is the corner of nodeB
    if ((-slopeB) === slopePrime)
    {
      if (p2x > p1x)
      {
        result[2] = bottomLeftBx;
        result[3] = bottomLeftBy;
        clipPointBFound = true;
      }
      else
      {
        result[2] = topRightBx;
        result[3] = topLeftBy;
        clipPointBFound = true;
      }
    }
    else if (slopeB === slopePrime)
    {
      if (p2x > p1x)
      {
        result[2] = topLeftBx;
        result[3] = topLeftBy;
        clipPointBFound = true;
      }
      else
      {
        result[2] = bottomRightBx;
        result[3] = bottomLeftBy;
        clipPointBFound = true;
      }
    }

    //if both clipping points are corners
    if (clipPointAFound && clipPointBFound)
    {
      return false;
    }

    //determine Cardinal Direction of rectangles
    if (p1x > p2x)
    {
      if (p1y > p2y)
      {
        cardinalDirectionA = this.getCardinalDirection(slopeA, slopePrime, 4);
        cardinalDirectionB = this.getCardinalDirection(slopeB, slopePrime, 2);
      }
      else
      {
        cardinalDirectionA = this.getCardinalDirection(-slopeA, slopePrime, 3);
        cardinalDirectionB = this.getCardinalDirection(-slopeB, slopePrime, 1);
      }
    }
    else
    {
      if (p1y > p2y)
      {
        cardinalDirectionA = this.getCardinalDirection(-slopeA, slopePrime, 1);
        cardinalDirectionB = this.getCardinalDirection(-slopeB, slopePrime, 3);
      }
      else
      {
        cardinalDirectionA = this.getCardinalDirection(slopeA, slopePrime, 2);
        cardinalDirectionB = this.getCardinalDirection(slopeB, slopePrime, 4);
      }
    }
    //calculate clipping Point if it is not found before
    if (!clipPointAFound)
    {
      switch (cardinalDirectionA)
      {
        case 1:
          tempPointAy = topLeftAy;
          tempPointAx = p1x + (-halfHeightA) / slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
        case 2:
          tempPointAx = bottomRightAx;
          tempPointAy = p1y + halfWidthA * slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
        case 3:
          tempPointAy = bottomLeftAy;
          tempPointAx = p1x + halfHeightA / slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
        case 4:
          tempPointAx = bottomLeftAx;
          tempPointAy = p1y + (-halfWidthA) * slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
      }
    }
    if (!clipPointBFound)
    {
      switch (cardinalDirectionB)
      {
        case 1:
          tempPointBy = topLeftBy;
          tempPointBx = p2x + (-halfHeightB) / slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
        case 2:
          tempPointBx = bottomRightBx;
          tempPointBy = p2y + halfWidthB * slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
        case 3:
          tempPointBy = bottomLeftBy;
          tempPointBx = p2x + halfHeightB / slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
        case 4:
          tempPointBx = bottomLeftBx;
          tempPointBy = p2y + (-halfWidthB) * slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
      }
    }
  }
  return false;
};

/**
 * This method returns in which cardinal direction does input point stays
 * 1: North
 * 2: East
 * 3: South
 * 4: West
 */
IGeometry.getCardinalDirection = function (slope, slopePrime, line)
{
  if (slope > slopePrime)
  {
    return line;
  }
  else
  {
    return 1 + line % 4;
  }
};

/**
 * This method calculates the intersection of the two lines defined by
 * point pairs (s1,s2) and (f1,f2).
 */
IGeometry.getIntersection = function(s1, s2, f1, f2)
{
  if (f2 == null) {
    return this.getIntersection2(s1, s2, f1);
  }

  let x1 = s1.x;
  let y1 = s1.y;
  let x2 = s2.x;
  let y2 = s2.y;
  let x3 = f1.x;
  let y3 = f1.y;
  let x4 = f2.x;
  let y4 = f2.y;
  let x, y; // intersection point
  let a1, a2, b1, b2, c1, c2; // coefficients of line eqns.
  let denom;

  a1 = y2 - y1;
  b1 = x1 - x2;
  c1 = x2 * y1 - x1 * y2;  // { a1*x + b1*y + c1 = 0 is line 1 }

  a2 = y4 - y3;
  b2 = x3 - x4;
  c2 = x4 * y3 - x3 * y4;  // { a2*x + b2*y + c2 = 0 is line 2 }

  denom = a1 * b2 - a2 * b1;

  if (denom === 0)
  {
    return null;
  }

  x = (b1 * c2 - b2 * c1) / denom;
  y = (a2 * c1 - a1 * c2) / denom;

  return new Point(x, y);
};

/**
 * This method finds and returns the angle of the vector from the + x-axis
 * in clockwise direction (compatible w/ Java coordinate system!).
 */
IGeometry.angleOfVector = function(Cx, Cy, Nx, Ny)
{
  let C_angle;

  if (Cx !== Nx)
  {
    C_angle = Math.atan((Ny - Cy) / (Nx - Cx));

    if (Nx < Cx)
    {
      C_angle += Math.PI;
    }
    else if (Ny < Cy)
    {
      C_angle += this.TWO_PI;
    }
  }
  else if (Ny < Cy)
  {
    C_angle = this.ONE_AND_HALF_PI; // 270 degrees
  }
  else
  {
    C_angle = this.HALF_PI; // 90 degrees
  }

  return C_angle;
};


/**
 * This method checks whether the given two line segments (one with point
 * p1 and p2, the other with point p3 and p4) intersect at a point other
 * than these points.
 */
IGeometry.doIntersect = function(p1, p2, p3, p4){
  let a = p1.x;
  let b = p1.y;
  let c = p2.x;
  let d = p2.y;
  let p = p3.x;
  let q = p3.y;
  let r = p4.x;
  let s = p4.y;
  let det = (c - a) * (s - q) - (r - p) * (d - b);

  if (det === 0) {
    return false;
  } else {
    let lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    let gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
};


// -----------------------------------------------------------------------------
// Section: Class Constants
// -----------------------------------------------------------------------------
/**
 * Some useful pre-calculated constants
 */
IGeometry.HALF_PI = 0.5 * Math.PI;
IGeometry.ONE_AND_HALF_PI = 1.5 * Math.PI;
IGeometry.TWO_PI = 2.0 * Math.PI;
IGeometry.THREE_PI = 3.0 * Math.PI;


module.exports = IGeometry;
