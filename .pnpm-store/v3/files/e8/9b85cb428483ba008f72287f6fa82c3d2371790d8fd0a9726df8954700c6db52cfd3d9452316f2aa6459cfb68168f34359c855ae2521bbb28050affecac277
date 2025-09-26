export const arePositionsSame = ( p1, p2 ) =>
  p1.x === p2.x && p1.y === p2.y;

export const copyPosition = p =>
  ({ x: p.x, y: p.y });

export const modelToRenderedPosition = ( p, zoom, pan ) => ({
  x: p.x * zoom + pan.x,
  y: p.y * zoom + pan.y
});

export const renderedToModelPosition = ( p, zoom, pan ) => ({
  x: ( p.x - pan.x ) / zoom,
  y: ( p.y - pan.y ) / zoom
});

export const array2point = arr => ({
  x: arr[0],
  y: arr[1]
});

export const min = ( arr, begin = 0, end = arr.length ) => {
  let min = Infinity;

  for( let i = begin; i < end; i++ ){
    let val = arr[i];

    if( isFinite(val) ){
      min = Math.min( val, min );
    }
  }

  return min;
};

export const max = ( arr, begin = 0, end = arr.length ) => {
  let max = -Infinity;

  for( let i = begin; i < end; i++ ){
    let val = arr[i];

    if( isFinite(val) ){
      max = Math.max( val, max );
    }
  }

  return max;
};

export const mean = ( arr, begin = 0, end = arr.length ) => {
  let total = 0;
  let n = 0;

  for( let i = begin; i < end; i++ ){
    let val = arr[i];

    if( isFinite(val) ){
      total += val;
      n++;
    }
  }

  return total / n;
};

export const median = ( arr, begin = 0, end = arr.length, copy = true, sort = true, includeHoles = true ) => {
  if( copy ){
    arr = arr.slice( begin, end );
  } else {
    if( end < arr.length ){
      arr.splice( end, arr.length - end );
    }

    if( begin > 0 ){
      arr.splice( 0, begin );
    }
  }

  // all non finite (e.g. Infinity, NaN) elements must be -Infinity so they go to the start
  let off  = 0; // offset from non-finite values
  for( let i = arr.length - 1; i >= 0; i-- ){
    let v = arr[i];

    if( includeHoles ){
      if( !isFinite(v) ){
        arr[i] = -Infinity;
        off++;
      }
    } else { // just remove it if we don't want to consider holes
      arr.splice(i, 1);
    }
  }

  if( sort ){
    arr.sort( (a, b) => a - b ); // requires copy = true if you don't want to change the orig
  }

  let len = arr.length;
  let mid = Math.floor( len / 2 );

  if( len % 2 !== 0 ){
    return arr[mid + 1 + off];
  } else {
    return ( arr[mid - 1 + off] + arr[mid + off] )/2;
  }
};

export const deg2rad = deg =>
  Math.PI * deg / 180;

export const getAngleFromDisp = ( dispX, dispY ) =>
  Math.atan2( dispY, dispX ) - Math.PI / 2;

export const log2 = Math.log2 || (n => Math.log( n ) / Math.log( 2 ));

export const signum = x => {
  if( x > 0 ){
    return 1;
  } else if( x < 0 ){
    return -1;
  } else {
    return 0;
  }
};

export const dist = ( p1, p2 ) =>
  Math.sqrt( sqdist( p1, p2 ) );

export const sqdist = ( p1, p2 ) => {
  let dx = p2.x - p1.x;
  let dy = p2.y - p1.y;

  return dx * dx + dy * dy;
};

export const inPlaceSumNormalize = v => {
  let length = v.length;

  // First, get sum of all elements
  let total = 0;
  for( let i = 0; i < length; i++ ){
    total += v[i];
  }

  // Now, divide each by the sum of all elements
  for( let i = 0; i < length; i++ ){
    v[i] = v[i] / total;
  }

  return v;
};

export const normalize = v => inPlaceSumNormalize( v.slice() );

// from http://en.wikipedia.org/wiki/Bézier_curve#Quadratic_curves
export const qbezierAt = ( p0, p1, p2, t ) =>
  (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;

export const qbezierPtAt = ( p0, p1, p2, t ) => ({
  x: qbezierAt( p0.x, p1.x, p2.x, t ),
  y: qbezierAt( p0.y, p1.y, p2.y, t )
});

export const lineAt = ( p0, p1, t, d ) => {
  let vec = {
    x: p1.x - p0.x,
    y: p1.y - p0.y
  };

  let vecDist = dist( p0, p1 );

  let normVec = {
    x: vec.x / vecDist,
    y: vec.y / vecDist
  };

  t = t == null ? 0 : t;

  d = d != null ? d : t * vecDist;

  return {
    x: p0.x + normVec.x * d,
    y: p0.y + normVec.y * d
  };
};

export const lineAtDist = ( p0, p1, d ) =>
  lineAt( p0, p1, undefined, d );

// get angle at A via cosine law
export const triangleAngle = ( A, B, C ) => {
  let a = dist( B, C );
  let b = dist( A, C );
  let c = dist( A, B );

  return Math.acos( (a*a + b*b - c*c)/(2*a*b) );
};

export const bound = ( min, val, max ) =>
  Math.max( min, Math.min( max, val ) );

// makes a full bb (x1, y1, x2, y2, w, h) from implicit params
export const makeBoundingBox = bb => {
  if( bb == null ){
    return {
      x1: Infinity,
      y1: Infinity,
      x2: -Infinity,
      y2: -Infinity,
      w: 0,
      h: 0
    };
  } else if( bb.x1 != null && bb.y1 != null ){
    if( bb.x2 != null && bb.y2 != null && bb.x2 >= bb.x1 && bb.y2 >= bb.y1 ){
      return {
        x1: bb.x1,
        y1: bb.y1,
        x2: bb.x2,
        y2: bb.y2,
        w: bb.x2 - bb.x1,
        h: bb.y2 - bb.y1
      };
    } else if( bb.w != null && bb.h != null && bb.w >= 0 && bb.h >= 0 ){
      return {
        x1: bb.x1,
        y1: bb.y1,
        x2: bb.x1 + bb.w,
        y2: bb.y1 + bb.h,
        w: bb.w,
        h: bb.h
      };
    }
  }
};

export const copyBoundingBox = bb => {
  return { x1: bb.x1, x2: bb.x2, w: bb.w, y1: bb.y1, y2: bb.y2, h: bb.h };
};

export const clearBoundingBox = bb => {
  bb.x1 = Infinity;
  bb.y1 = Infinity;
  bb.x2 = -Infinity;
  bb.y2 = -Infinity;
  bb.w = 0;
  bb.h = 0;
};

export const shiftBoundingBox = function( bb, dx, dy ){
  return {
    x1: bb.x1 + dx,
    x2: bb.x2 + dx,
    y1: bb.y1 + dy,
    y2: bb.y2 + dy,
    w: bb.w,
    h: bb.h
  };
};

export const updateBoundingBox = function( bb1, bb2 ){
  // update bb1 with bb2 bounds

  bb1.x1 = Math.min( bb1.x1, bb2.x1 );
  bb1.x2 = Math.max( bb1.x2, bb2.x2 );
  bb1.w = bb1.x2 - bb1.x1;

  bb1.y1 = Math.min( bb1.y1, bb2.y1 );
  bb1.y2 = Math.max( bb1.y2, bb2.y2 );
  bb1.h = bb1.y2 - bb1.y1;
};

export const expandBoundingBoxByPoint = ( bb, x, y ) => {
  bb.x1 = Math.min( bb.x1, x );
  bb.x2 = Math.max( bb.x2, x );
  bb.w = bb.x2 - bb.x1;

  bb.y1 = Math.min( bb.y1, y );
  bb.y2 = Math.max( bb.y2, y );
  bb.h = bb.y2 - bb.y1;
};

export const expandBoundingBox = ( bb, padding = 0 ) => {
  bb.x1 -= padding;
  bb.x2 += padding;
  bb.y1 -= padding;
  bb.y2 += padding;
  bb.w = bb.x2 - bb.x1;
  bb.h = bb.y2 - bb.y1;

  return bb;
};

export const expandBoundingBoxSides = (bb, padding = [0] ) => {
  let top, right, bottom, left;
  if (padding.length === 1) {
    top = right = bottom = left = padding[0];
  } else if (padding.length === 2) {
    top = bottom = padding[0];
    left = right = padding[1];
  } else if (padding.length === 4) {
    [top, right, bottom, left] = padding;
  }

  bb.x1 -= left;
  bb.x2 += right;
  bb.y1 -= top;
  bb.y2 += bottom;
  bb.w = bb.x2 - bb.x1;
  bb.h = bb.y2 - bb.y1;

  return bb;
};

const expandToInt = x => x > 0 ? Math.ceil(x) : Math.floor(x);

export const expandBoundingBoxToInts = ( bb, padding = 0 ) => {
  bb.x1 = expandToInt(bb.x1 - padding);
  bb.y1 = expandToInt(bb.y1 - padding);
  bb.x2 = expandToInt(bb.x2 + padding);
  bb.y2 = expandToInt(bb.y2 + padding);
  bb.w = bb.x2 - bb.x1;
  bb.h = bb.y2 - bb.y1;
};

// assign the values of bb2 into bb1
export const assignBoundingBox = ( bb1, bb2 ) => {
  bb1.x1 = bb2.x1;
  bb1.y1 = bb2.y1;
  bb1.x2 = bb2.x2;
  bb1.y2 = bb2.y2;
  bb1.w = bb1.x2 - bb1.x1;
  bb1.h = bb1.y2 - bb1.y1;
};

export const assignShiftToBoundingBox = ( bb, delta ) => {
  bb.x1 += delta.x;
  bb.x2 += delta.x;
  bb.y1 += delta.y;
  bb.y2 += delta.y;
};

export const boundingBoxesIntersect = ( bb1, bb2 ) => {
  // case: one bb to right of other
  if( bb1.x1 > bb2.x2 ){ return false; }
  if( bb2.x1 > bb1.x2 ){ return false; }

  // case: one bb to left of other
  if( bb1.x2 < bb2.x1 ){ return false; }
  if( bb2.x2 < bb1.x1 ){ return false; }

  // case: one bb above other
  if( bb1.y2 < bb2.y1 ){ return false; }
  if( bb2.y2 < bb1.y1 ){ return false; }

  // case: one bb below other
  if( bb1.y1 > bb2.y2 ){ return false; }
  if( bb2.y1 > bb1.y2 ){ return false; }

  // otherwise, must have some overlap
  return true;
};

export const inBoundingBox = ( bb, x, y ) =>
  bb.x1 <= x && x <= bb.x2 && bb.y1 <= y && y <= bb.y2;

export const pointInBoundingBox = ( bb, pt ) =>
  inBoundingBox( bb, pt.x, pt.y );

export const boundingBoxInBoundingBox = ( bb1, bb2 ) => (
     inBoundingBox( bb1, bb2.x1, bb2.y1 )
  && inBoundingBox( bb1, bb2.x2, bb2.y2 )
);

export const hypot = Math.hypot ?? ((x, y) => Math.sqrt(x * x + y * y));

function inflatePolygon(polygon, d) {
  if (polygon.length < 3) {
    throw new Error('Need at least 3 vertices');
  }
  // Helpers
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const scale = (v, s) => ({ x: v.x * s, y: v.y * s });
  const cross = (u, v) => u.x * v.y - u.y * v.x;
  const normalize = v => {
    const len = hypot(v.x, v.y);
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
  };
  // Signed area (positive = CCW)
  const signedArea = pts => {
    let A = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      A += p.x * q.y - q.x * p.y;
    }
    return A / 2;
  };
  // Line–line intersection (infinite lines)
  const intersectLines = (p1, p2, p3, p4) => {
    const r = sub(p2, p1);
    const s = sub(p4, p3);
    const denom = cross(r, s);
    if (Math.abs(denom) < 1e-9) {
      // Parallel or nearly so — fallback to midpoint
      return add(p1, scale(r, 0.5));
    }
    const t = cross(sub(p3, p1), s) / denom;
    return add(p1, scale(r, t));
  };

  // Make a shallow copy and enforce CCW
  const pts = polygon.map(p => ({ x: p.x, y: p.y }));
  if (signedArea(pts) < 0) pts.reverse();

  const n = pts.length;
  // Compute outward normals for each edge
  const normals = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    const edge = sub(q, p);
    // For CCW polygon, inward normal = (-edge.y, edge.x)
    // so outward normal = (edge.y, -edge.x)
    const out = normalize({ x:  edge.y, y: -edge.x });
    normals.push(out);
  }

  // Build offset edges
  const offsetEdges = normals.map((nrm, i) => {
    const p1 = add(pts[i], scale(nrm, d));
    const p2 = add(pts[(i + 1) % n], scale(nrm, d));
    return { p1, p2 };
  });

  // Intersect consecutive offset edges
  const inflated = [];
  for (let i = 0; i < n; i++) {
    const prevEdge = offsetEdges[(i - 1 + n) % n];
    const currEdge = offsetEdges[i];
    const ip = intersectLines(prevEdge.p1, prevEdge.p2, currEdge.p1, currEdge.p2);
    inflated.push(ip);
  }

  return inflated;
}


export function miterBox(pts, centerX, centerY, width, height, strokeWidth) {
  const tpts = transformPoints(pts, centerX, centerY, width, height);
  let offsetPoints = inflatePolygon(tpts, strokeWidth);
  let bb = makeBoundingBox();

  offsetPoints.forEach(pt => expandBoundingBoxByPoint(bb, pt.x, pt.y));

  return bb;
}

export const roundRectangleIntersectLine = ( x, y, nodeX, nodeY, width, height, padding, radius = 'auto' ) => {

  let cornerRadius = radius === 'auto' ? getRoundRectangleRadius( width, height ) : radius;

  let halfWidth = width / 2;
  let halfHeight = height / 2;
  cornerRadius = Math.min(cornerRadius, halfWidth, halfHeight);
  const doWidth = cornerRadius !== halfWidth, doHeight = cornerRadius !== halfHeight;

  // Check intersections with straight line segments
  let straightLineIntersections;

  // Top segment, left to right
  if( doWidth ){
    let topStartX = nodeX - halfWidth + cornerRadius - padding;
    let topStartY = nodeY - halfHeight - padding;
    let topEndX = nodeX + halfWidth - cornerRadius + padding;
    let topEndY = topStartY;

    straightLineIntersections = finiteLinesIntersect(
      x, y, nodeX, nodeY, topStartX, topStartY, topEndX, topEndY, false );

    if( straightLineIntersections.length > 0 ){
      return straightLineIntersections;
    }
  }

  // Right segment, top to bottom
  if( doHeight ){
    let rightStartX = nodeX + halfWidth + padding;
    let rightStartY = nodeY - halfHeight + cornerRadius - padding;
    let rightEndX = rightStartX;
    let rightEndY = nodeY + halfHeight - cornerRadius + padding;

    straightLineIntersections = finiteLinesIntersect(
      x, y, nodeX, nodeY, rightStartX, rightStartY, rightEndX, rightEndY, false );

    if( straightLineIntersections.length > 0 ){
      return straightLineIntersections;
    }
  }

  // Bottom segment, left to right
  if( doWidth ){
    let bottomStartX = nodeX - halfWidth + cornerRadius - padding;
    let bottomStartY = nodeY + halfHeight + padding;
    let bottomEndX = nodeX + halfWidth - cornerRadius + padding;
    let bottomEndY = bottomStartY;

    straightLineIntersections = finiteLinesIntersect(
      x, y, nodeX, nodeY, bottomStartX, bottomStartY, bottomEndX, bottomEndY, false );

    if( straightLineIntersections.length > 0 ){
      return straightLineIntersections;
    }
  }

  // Left segment, top to bottom
  if( doHeight ){
    let leftStartX = nodeX - halfWidth - padding;
    let leftStartY = nodeY - halfHeight + cornerRadius - padding;
    let leftEndX = leftStartX;
    let leftEndY = nodeY + halfHeight - cornerRadius + padding;

    straightLineIntersections = finiteLinesIntersect(
      x, y, nodeX, nodeY, leftStartX, leftStartY, leftEndX, leftEndY, false );

    if( straightLineIntersections.length > 0 ){
      return straightLineIntersections;
    }
  }

  // Check intersections with arc segments
  let arcIntersections;

  // Top Left
  {
    let topLeftCenterX = nodeX - halfWidth + cornerRadius;
    let topLeftCenterY = nodeY - halfHeight + cornerRadius;
    arcIntersections = intersectLineCircle(
      x, y, nodeX, nodeY,
      topLeftCenterX, topLeftCenterY, cornerRadius + padding );

    // Ensure the intersection is on the desired quarter of the circle
    if( arcIntersections.length > 0
      && arcIntersections[0] <= topLeftCenterX
      && arcIntersections[1] <= topLeftCenterY ){
      return [ arcIntersections[0], arcIntersections[1] ];
    }
  }

  // Top Right
  {
    let topRightCenterX = nodeX + halfWidth - cornerRadius;
    let topRightCenterY = nodeY - halfHeight + cornerRadius;
    arcIntersections = intersectLineCircle(
      x, y, nodeX, nodeY,
      topRightCenterX, topRightCenterY, cornerRadius + padding );

    // Ensure the intersection is on the desired quarter of the circle
    if( arcIntersections.length > 0
      && arcIntersections[0] >= topRightCenterX
      && arcIntersections[1] <= topRightCenterY ){
      return [ arcIntersections[0], arcIntersections[1] ];
    }
  }

  // Bottom Right
  {
    let bottomRightCenterX = nodeX + halfWidth - cornerRadius;
    let bottomRightCenterY = nodeY + halfHeight - cornerRadius;
    arcIntersections = intersectLineCircle(
      x, y, nodeX, nodeY,
      bottomRightCenterX, bottomRightCenterY, cornerRadius + padding );

    // Ensure the intersection is on the desired quarter of the circle
    if( arcIntersections.length > 0
      && arcIntersections[0] >= bottomRightCenterX
      && arcIntersections[1] >= bottomRightCenterY ){
      return [ arcIntersections[0], arcIntersections[1] ];
    }
  }

  // Bottom Left
  {
    let bottomLeftCenterX = nodeX - halfWidth + cornerRadius;
    let bottomLeftCenterY = nodeY + halfHeight - cornerRadius;
    arcIntersections = intersectLineCircle(
      x, y, nodeX, nodeY,
      bottomLeftCenterX, bottomLeftCenterY, cornerRadius + padding );

    // Ensure the intersection is on the desired quarter of the circle
    if( arcIntersections.length > 0
      && arcIntersections[0] <= bottomLeftCenterX
      && arcIntersections[1] >= bottomLeftCenterY ){
      return [ arcIntersections[0], arcIntersections[1] ];
    }
  }

  return []; // if nothing
};

export const inLineVicinity = ( x, y, lx1, ly1, lx2, ly2, tolerance ) => {
  let t = tolerance;

  let x1 = Math.min( lx1, lx2 );
  let x2 = Math.max( lx1, lx2 );
  let y1 = Math.min( ly1, ly2 );
  let y2 = Math.max( ly1, ly2 );

  return x1 - t <= x && x <= x2 + t
    && y1 - t <= y && y <= y2 + t;
};

export const inBezierVicinity = ( x, y, x1, y1, x2, y2, x3, y3, tolerance ) => {

  let bb = {
    x1: Math.min( x1, x3, x2 ) - tolerance,
    x2: Math.max( x1, x3, x2 ) + tolerance,
    y1: Math.min( y1, y3, y2 ) - tolerance,
    y2: Math.max( y1, y3, y2 ) + tolerance
  };

  // if outside the rough bounding box for the bezier, then it can't be a hit
  if( x < bb.x1 || x > bb.x2 || y < bb.y1 || y > bb.y2 ){
    // console.log('bezier out of rough bb')
    return false;
  } else {
    // console.log('do more expensive check');
    return true;
  }

};

export const solveQuadratic = ( a, b, c, val ) => {
  c -= val;

  var r = b * b - 4 * a * c;

  if( r < 0 ){ return []; }

  var sqrtR = Math.sqrt( r );
  var denom = 2 * a;
  var root1 = ( -b + sqrtR ) / denom;
  var root2 = ( -b - sqrtR ) / denom;

  return [ root1, root2 ];
};

export const solveCubic = ( a, b, c, d, result ) => {

  // Solves a cubic function, returns root in form [r1, i1, r2, i2, r3, i3], where
  // r is the real component, i is the imaginary component

  // An implementation of the Cardano method from the year 1545
  // http://en.wikipedia.org/wiki/Cubic_function#The_nature_of_the_roots

  var epsilon = 0.00001;

  // avoid division by zero while keeping the overall expression close in value
  if( a === 0 ){
    a = epsilon;
  }

  b /= a;
  c /= a;
  d /= a;

  let discriminant, q, r, dum1, s, t, term1, r13;

  q = (3.0 * c - (b * b)) / 9.0;
  r = -(27.0 * d) + b * (9.0 * c - 2.0 * (b * b));
  r /= 54.0;

  discriminant = q * q * q + r * r;
  result[1] = 0;
  term1 = (b / 3.0);

  if( discriminant > 0 ){
    s = r + Math.sqrt( discriminant );
    s = ((s < 0) ? -Math.pow( -s, (1.0 / 3.0) ) : Math.pow( s, (1.0 / 3.0) ));
    t = r - Math.sqrt( discriminant );
    t = ((t < 0) ? -Math.pow( -t, (1.0 / 3.0) ) : Math.pow( t, (1.0 / 3.0) ));
    result[0] = -term1 + s + t;
    term1 += (s + t) / 2.0;
    result[4] = result[2] = -term1;
    term1 = Math.sqrt( 3.0 ) * (-t + s) / 2;
    result[3] = term1;
    result[5] = -term1;
    return;
  }

  result[5] = result[3] = 0;

  if( discriminant === 0 ){
    r13 = ((r < 0) ? -Math.pow( -r, (1.0 / 3.0) ) : Math.pow( r, (1.0 / 3.0) ));
    result[0] = -term1 + 2.0 * r13;
    result[4] = result[2] = -(r13 + term1);
    return;
  }

  q = -q;
  dum1 = q * q * q;
  dum1 = Math.acos( r / Math.sqrt( dum1 ) );
  r13 = 2.0 * Math.sqrt( q );
  result[0] = -term1 + r13 * Math.cos( dum1 / 3.0 );
  result[2] = -term1 + r13 * Math.cos( (dum1 + 2.0 * Math.PI) / 3.0 );
  result[4] = -term1 + r13 * Math.cos( (dum1 + 4.0 * Math.PI) / 3.0 );

  return;
};

export const sqdistToQuadraticBezier = ( x, y, x1, y1, x2, y2, x3, y3 ) => {

  // Find minimum distance by using the minimum of the distance
  // function between the given point and the curve

  // This gives the coefficients of the resulting cubic equation
  // whose roots tell us where a possible minimum is
  // (Coefficients are divided by 4)

  let a = 1.0 * x1 * x1 - 4 * x1 * x2 + 2 * x1 * x3 + 4 * x2 * x2 - 4 * x2 * x3 + x3 * x3
    + y1 * y1 - 4 * y1 * y2 + 2 * y1 * y3 + 4 * y2 * y2 - 4 * y2 * y3 + y3 * y3;

  let b = 1.0 * 9 * x1 * x2 - 3 * x1 * x1 - 3 * x1 * x3 - 6 * x2 * x2 + 3 * x2 * x3
    + 9 * y1 * y2 - 3 * y1 * y1 - 3 * y1 * y3 - 6 * y2 * y2 + 3 * y2 * y3;

  let c = 1.0 * 3 * x1 * x1 - 6 * x1 * x2 + x1 * x3 - x1 * x + 2 * x2 * x2 + 2 * x2 * x - x3 * x
    + 3 * y1 * y1 - 6 * y1 * y2 + y1 * y3 - y1 * y + 2 * y2 * y2 + 2 * y2 * y - y3 * y;

  let d = 1.0 * x1 * x2 - x1 * x1 + x1 * x - x2 * x
    + y1 * y2 - y1 * y1 + y1 * y - y2 * y;

  // debug("coefficients: " + a / a + ", " + b / a + ", " + c / a + ", " + d / a);

  let roots = [];

  // Use the cubic solving algorithm
  solveCubic( a, b, c, d, roots );

  let zeroThreshold = 0.0000001;

  let params = [];

  for( let index = 0; index < 6; index += 2 ){
    if( Math.abs( roots[ index + 1] ) < zeroThreshold
        && roots[ index ] >= 0
        && roots[ index ] <= 1.0 ){
      params.push( roots[ index ] );
    }
  }

  params.push( 1.0 );
  params.push( 0.0 );

  let minDistanceSquared = -1;

  let curX, curY, distSquared;
  for( let i = 0; i < params.length; i++ ){
    curX = Math.pow( 1.0 - params[ i ], 2.0 ) * x1
      + 2.0 * (1 - params[ i ]) * params[ i ] * x2
      + params[ i ] * params[ i ] * x3;

    curY = Math.pow( 1 - params[ i ], 2.0 ) * y1
      + 2 * (1.0 - params[ i ]) * params[ i ] * y2
      + params[ i ] * params[ i ] * y3;

    distSquared = Math.pow( curX - x, 2 ) + Math.pow( curY - y, 2 );
    // debug('distance for param ' + params[i] + ": " + Math.sqrt(distSquared));
    if( minDistanceSquared >= 0 ){
      if( distSquared < minDistanceSquared ){
        minDistanceSquared = distSquared;
      }
    } else {
      minDistanceSquared = distSquared;
    }
  }

  return minDistanceSquared;
};

export const sqdistToFiniteLine = ( x, y, x1, y1, x2, y2 ) => {
  let offset = [ x - x1, y - y1 ];
  let line = [ x2 - x1, y2 - y1 ];

  let lineSq = line[0] * line[0] + line[1] * line[1];
  let hypSq = offset[0] * offset[0] + offset[1] * offset[1];

  let dotProduct = offset[0] * line[0] + offset[1] * line[1];
  let adjSq = dotProduct * dotProduct / lineSq;

  if( dotProduct < 0 ){
    return hypSq;
  }

  if( adjSq > lineSq ){
    return (x - x2) * (x - x2) + (y - y2) * (y - y2);
  }

  return hypSq - adjSq;
};

export const pointInsidePolygonPoints = ( x, y, points ) => {
  let x1, y1, x2, y2;
  let y3;

  // Intersect with vertical line through (x, y)
  let up = 0;
  // let down = 0;
  for( let i = 0; i < points.length / 2; i++ ){
    x1 = points[ i * 2];
    y1 = points[ i * 2 + 1];

    if( i + 1 < points.length / 2 ){
      x2 = points[ (i + 1) * 2];
      y2 = points[ (i + 1) * 2 + 1];
    } else {
      x2 = points[ (i + 1 - points.length / 2) * 2];
      y2 = points[ (i + 1 - points.length / 2) * 2 + 1];
    }

    if( x1 == x && x2 == x ){
      // then ignore
    } else if( (x1 >= x && x >= x2)
      || (x1 <= x && x <= x2) ){

      y3 = (x - x1) / (x2 - x1) * (y2 - y1) + y1;

      if( y3 > y ){
        up++;
      }

      // if( y3 < y ){
        // down++;
      // }

    } else {
      continue;
    }

  }

  if( up % 2 === 0 ){
    return false;
  } else {
    return true;
  }
};

export const pointInsidePolygon = ( x, y, basePoints, centerX, centerY, width, height, direction, padding ) => {
  let transformedPoints = new Array( basePoints.length );

  // Gives negative angle
  let angle;

  if( direction[0] != null ){
    angle = Math.atan( direction[1] / direction[0] );

    if( direction[0] < 0 ){
      angle = angle + Math.PI / 2;
    } else {
      angle = -angle - Math.PI / 2;
    }
  } else {
    angle = direction;
  }

  let cos = Math.cos( -angle );
  let sin = Math.sin( -angle );

  //    console.log("base: " + basePoints);
  for( let i = 0; i < transformedPoints.length / 2; i++ ){
    transformedPoints[ i * 2] =
      width / 2 * (basePoints[ i * 2] * cos
        - basePoints[ i * 2 + 1] * sin);

    transformedPoints[ i * 2 + 1] =
      height / 2 * (basePoints[ i * 2 + 1] * cos
        + basePoints[ i * 2] * sin);

    transformedPoints[ i * 2] += centerX;
    transformedPoints[ i * 2 + 1] += centerY;
  }

  let points;

  if( padding > 0 ){
    let expandedLineSet = expandPolygon(
      transformedPoints,
      -padding );

    points = joinLines( expandedLineSet );
  } else {
    points = transformedPoints;
  }

  return pointInsidePolygonPoints( x, y, points );
};

export const pointInsideRoundPolygon = (x, y, basePoints, centerX, centerY, width, height, corners) => {
  const cutPolygonPoints = new Array( basePoints.length * 2 );

  for( let i = 0; i < corners.length; i++ ){
    let corner = corners[i];
    cutPolygonPoints[i * 4 + 0] = corner.startX;
    cutPolygonPoints[i * 4 + 1] = corner.startY;
    cutPolygonPoints[i * 4 + 2] = corner.stopX;
    cutPolygonPoints[i * 4 + 3] = corner.stopY;

    const squaredDistance = Math.pow(corner.cx - x, 2 ) + Math.pow(corner.cy - y, 2 );
    if( squaredDistance <= Math.pow( corner.radius, 2 ) ){
      return true;
    }
  }

  return pointInsidePolygonPoints(x, y, cutPolygonPoints);
};

export const joinLines = ( lineSet ) => {

  let vertices = new Array( lineSet.length / 2 );

  let currentLineStartX, currentLineStartY, currentLineEndX, currentLineEndY;
  let nextLineStartX, nextLineStartY, nextLineEndX, nextLineEndY;

  for( let i = 0; i < lineSet.length / 4; i++ ){
    currentLineStartX = lineSet[ i * 4];
    currentLineStartY = lineSet[ i * 4 + 1];
    currentLineEndX = lineSet[ i * 4 + 2];
    currentLineEndY = lineSet[ i * 4 + 3];

    if( i < lineSet.length / 4 - 1 ){
      nextLineStartX = lineSet[ (i + 1) * 4];
      nextLineStartY = lineSet[ (i + 1) * 4 + 1];
      nextLineEndX = lineSet[ (i + 1) * 4 + 2];
      nextLineEndY = lineSet[ (i + 1) * 4 + 3];
    } else {
      nextLineStartX = lineSet[0];
      nextLineStartY = lineSet[1];
      nextLineEndX = lineSet[2];
      nextLineEndY = lineSet[3];
    }

    let intersection = finiteLinesIntersect(
      currentLineStartX, currentLineStartY,
      currentLineEndX, currentLineEndY,
      nextLineStartX, nextLineStartY,
      nextLineEndX, nextLineEndY,
      true );

    vertices[ i * 2] = intersection[0];
    vertices[ i * 2 + 1] = intersection[1];
  }

  return vertices;
};

export const expandPolygon = ( points, pad ) => {

  let expandedLineSet = new Array( points.length * 2 );

  let currentPointX, currentPointY, nextPointX, nextPointY;

  for( let i = 0; i < points.length / 2; i++ ){
    currentPointX = points[ i * 2];
    currentPointY = points[ i * 2 + 1];

    if( i < points.length / 2 - 1 ){
      nextPointX = points[ (i + 1) * 2];
      nextPointY = points[ (i + 1) * 2 + 1];
    } else {
      nextPointX = points[0];
      nextPointY = points[1];
    }

    // Current line: [currentPointX, currentPointY] to [nextPointX, nextPointY]

    // Assume CCW polygon winding

    let offsetX = (nextPointY - currentPointY);
    let offsetY = -(nextPointX - currentPointX);

    // Normalize
    let offsetLength = Math.sqrt( offsetX * offsetX + offsetY * offsetY );
    let normalizedOffsetX = offsetX / offsetLength;
    let normalizedOffsetY = offsetY / offsetLength;

    expandedLineSet[ i * 4] = currentPointX + normalizedOffsetX * pad;
    expandedLineSet[ i * 4 + 1] = currentPointY + normalizedOffsetY * pad;
    expandedLineSet[ i * 4 + 2] = nextPointX + normalizedOffsetX * pad;
    expandedLineSet[ i * 4 + 3] = nextPointY + normalizedOffsetY * pad;
  }

  return expandedLineSet;
};

export const intersectLineEllipse = ( x, y, centerX, centerY, ellipseWradius, ellipseHradius ) => {

  let dispX = centerX - x;
  let dispY = centerY - y;

  dispX /= ellipseWradius;
  dispY /= ellipseHradius;

  let len = Math.sqrt( dispX * dispX + dispY * dispY );

  let newLength = len - 1;

  if( newLength < 0 ){
    return [];
  }

  let lenProportion = newLength / len;

  return [ (centerX - x) * lenProportion + x, (centerY - y) * lenProportion + y ];
};

export const checkInEllipse = ( x, y, width, height, centerX, centerY, padding ) => {
  x -= centerX;
  y -= centerY;

  x /= (width / 2 + padding);
  y /= (height / 2 + padding);

  return x * x + y * y <= 1;
};

// Returns intersections of increasing distance from line's start point
export const intersectLineCircle = ( x1, y1, x2, y2, centerX, centerY, radius ) => {

  // Calculate d, direction vector of line
  let d = [ x2 - x1, y2 - y1 ]; // Direction vector of line
  let f = [ x1 - centerX, y1 - centerY ];

  let a = d[0] * d[0] + d[1] * d[1];
  let b = 2 * (f[0] * d[0] + f[1] * d[1]);
  let c = (f[0] * f[0] + f[1] * f[1]) - radius * radius ;

  let discriminant = b * b - 4 * a * c;

  if( discriminant < 0 ){
    return [];
  }

  let t1 = (-b + Math.sqrt( discriminant )) / (2 * a);
  let t2 = (-b - Math.sqrt( discriminant )) / (2 * a);

  let tMin = Math.min( t1, t2 );
  let tMax = Math.max( t1, t2 );
  let inRangeParams = [];

  if( tMin >= 0 && tMin <= 1 ){
    inRangeParams.push( tMin );
  }

  if( tMax >= 0 && tMax <= 1 ){
    inRangeParams.push( tMax );
  }

  if( inRangeParams.length === 0 ){
    return [];
  }

  let nearIntersectionX = inRangeParams[0] * d[0] + x1;
  let nearIntersectionY = inRangeParams[0] * d[1] + y1;

  if( inRangeParams.length > 1 ){

    if( inRangeParams[0] == inRangeParams[1] ){
      return [ nearIntersectionX, nearIntersectionY ];
    } else {

      let farIntersectionX = inRangeParams[1] * d[0] + x1;
      let farIntersectionY = inRangeParams[1] * d[1] + y1;

      return [ nearIntersectionX, nearIntersectionY, farIntersectionX, farIntersectionY ];
    }

  } else {
    return [ nearIntersectionX, nearIntersectionY ];
  }

};

export const findCircleNearPoint = ( centerX, centerY, radius, farX, farY ) => {

  let displacementX = farX - centerX;
  let displacementY = farY - centerY;
  let distance = Math.sqrt( displacementX * displacementX
    + displacementY * displacementY );

  let unitDisplacementX = displacementX / distance;
  let unitDisplacementY = displacementY / distance;

  return [ centerX + unitDisplacementX * radius,
    centerY + unitDisplacementY * radius ];
};

export const findMaxSqDistanceToOrigin = ( points ) => {
  let maxSqDistance = 0.000001;
  let sqDistance;

  for( let i = 0; i < points.length / 2; i++ ){

    sqDistance = points[ i * 2] * points[ i * 2]
      + points[ i * 2 + 1] * points[ i * 2 + 1];

    if( sqDistance > maxSqDistance ){
      maxSqDistance = sqDistance;
    }
  }

  return maxSqDistance;
};

export const midOfThree = ( a, b, c ) => {
  if( (b <= a && a <= c) || (c <= a && a <= b) ){
    return a;
  } else if( (a <= b && b <= c) || (c <= b && b <= a) ){
    return b;
  } else {
    return c;
  }
};

// (x1,y1)=>(x2,y2) intersect with (x3,y3)=>(x4,y4)
export const finiteLinesIntersect = (
  x1, y1, x2, y2,
  x3, y3, x4, y4,
  infiniteLines
) => {

  let dx13 = x1 - x3;
  let dx21 = x2 - x1;
  let dx43 = x4 - x3;

  let dy13 = y1 - y3;
  let dy21 = y2 - y1;
  let dy43 = y4 - y3;

  let ua_t = dx43 * dy13 - dy43 * dx13;
  let ub_t = dx21 * dy13 - dy21 * dx13;
  let u_b  = dy43 * dx21 - dx43 * dy21;

  if( u_b !== 0 ){
    let ua = ua_t / u_b;
    let ub = ub_t / u_b;

    let flptThreshold = 0.001;
    let min = 0 - flptThreshold;
    let max = 1 + flptThreshold;

    if( min <= ua && ua <= max && min <= ub && ub <= max ){
      return [ x1 + ua * dx21, y1 + ua * dy21 ];

    } else {
      if( !infiniteLines ){
        return [];
      } else {
        return [ x1 + ua * dx21, y1 + ua * dy21 ];
      }
    }
  } else {
    if( ua_t === 0 || ub_t === 0 ){

      // Parallel, coincident lines. Check if overlap

      // Check endpoint of second line
      if( midOfThree( x1, x2, x4 ) === x4 ){
        return [ x4, y4 ];
      }

      // Check start point of second line
      if( midOfThree( x1, x2, x3 ) === x3 ){
        return [ x3, y3 ];
      }

      // Endpoint of first line
      if( midOfThree( x3, x4, x2 ) === x2 ){
        return [ x2, y2 ];
      }

      return [];
    } else {

      // Parallel, non-coincident
      return [];
    }
  }
};

export const transformPoints = ( points, centerX, centerY, width, height ) => {
  let ret = [];

  var halfW = width / 2;
  var halfH = height / 2;

  let x = centerX;
  let y = centerY;

  ret.push({
    x: x + halfW * points[0],
    y: y + halfH * points[1]
  });

  for( var i = 1; i < points.length / 2; i++ ){
    ret.push({ 
      x: x + halfW * points[i * 2], 
      y: y + halfH * points[i * 2 + 1]
    });
  }

  return ret;
};

// math.polygonIntersectLine( x, y, basePoints, centerX, centerY, width, height, padding )
// intersect a node polygon (pts transformed)
//
// math.polygonIntersectLine( x, y, basePoints, centerX, centerY )
// intersect the points (no transform)
export const polygonIntersectLine = ( x, y, basePoints, centerX, centerY, width, height, padding ) => {

  let intersections = [];
  let intersection;

  let transformedPoints = new Array( basePoints.length );

  let doTransform = true;
  if( width == null ){
    doTransform = false;
  }

  let points;

  if( doTransform ){
    for( let i = 0; i < transformedPoints.length / 2; i++ ){
      transformedPoints[ i * 2] = basePoints[ i * 2] * width + centerX;
      transformedPoints[ i * 2 + 1] = basePoints[ i * 2 + 1] * height + centerY;
    }

    if( padding > 0 ){
      let expandedLineSet = expandPolygon(
        transformedPoints,
        -padding );

      points = joinLines( expandedLineSet );
    } else {
      points = transformedPoints;
    }
  } else {
    points = basePoints;
  }

  let currentX, currentY, nextX, nextY;

  for( let i = 0; i < points.length / 2; i++ ){

    currentX = points[ i * 2];
    currentY = points[ i * 2 + 1];

    if( i < points.length / 2 - 1 ){
      nextX = points[ (i + 1) * 2];
      nextY = points[ (i + 1) * 2 + 1];
    } else {
      nextX = points[0];
      nextY = points[1];
    }

    intersection = finiteLinesIntersect(
      x, y, centerX, centerY,
      currentX, currentY,
      nextX, nextY );

    if( intersection.length !== 0 ){
      intersections.push( intersection[0], intersection[1] );
    }
  }

  return intersections;
};

export const roundPolygonIntersectLine = ( x, y, basePoints, centerX, centerY, width, height, padding, corners ) => {
  let intersections = [];
  let intersection;
  let lines = new Array(basePoints.length * 2);

  corners.forEach( (corner, i) => {
    if (i === 0) {
      lines[lines.length - 2] = corner.startX;
      lines[lines.length - 1] = corner.startY;
    } else {
      lines[i * 4 - 2] = corner.startX;
      lines[i * 4 - 1] = corner.startY;
    }

    lines[i * 4] = corner.stopX;
    lines[i * 4 + 1] = corner.stopY;

    intersection = intersectLineCircle(x, y, centerX, centerY, corner.cx, corner.cy, corner.radius);

    if (intersection.length !== 0) {
      intersections.push(intersection[0], intersection[1]);
    }
  });

  for( let i = 0; i < lines.length / 4; i++ ) {
    intersection = finiteLinesIntersect(
        x, y, centerX, centerY,
        lines[i * 4], lines[i * 4 + 1],
        lines[i * 4 + 2], lines[i * 4 + 3], false );

    if( intersection.length !== 0 ){
      intersections.push( intersection[0], intersection[1] );
    }
  }

  if (intersections.length > 2) {
    let lowestIntersection = [ intersections[0], intersections[1] ];
    let lowestSquaredDistance = Math.pow(lowestIntersection[0] - x, 2) + Math.pow(lowestIntersection[1] - y, 2);
    for ( let i = 1; i < intersections.length / 2; i++){
      const squaredDistance = Math.pow(intersections[ i * 2 ] - x, 2) + Math.pow(intersections[ i * 2 + 1 ] - y, 2);
      if ( squaredDistance <= lowestSquaredDistance ){
        lowestIntersection[0] = intersections[ i * 2 ];
        lowestIntersection[1] = intersections[ i * 2 + 1 ];
        lowestSquaredDistance = squaredDistance;
      }
    }
    return lowestIntersection;
  }

  return intersections;
};

export const shortenIntersection = ( intersection, offset, amount ) => {

  let disp = [ intersection[0] - offset[0], intersection[1] - offset[1] ];

  let length = Math.sqrt( disp[0] * disp[0] + disp[1] * disp[1] );

  let lenRatio = (length - amount) / length;

  if( lenRatio < 0 ){
    lenRatio = 0.00001;
  }

  return [ offset[0] + lenRatio * disp[0], offset[1] + lenRatio * disp[1] ];
};

export const generateUnitNgonPointsFitToSquare = ( sides, rotationRadians ) => {
  let points = generateUnitNgonPoints( sides, rotationRadians );
  points = fitPolygonToSquare( points );

  return points;
};

export const fitPolygonToSquare = ( points ) => {
  let x, y;
  let sides = points.length / 2;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for( let i = 0; i < sides; i++ ){
    x = points[2 * i ];
    y = points[2 * i + 1];

    minX = Math.min( minX, x );
    maxX = Math.max( maxX, x );
    minY = Math.min( minY, y );
    maxY = Math.max( maxY, y );
  }

  // stretch factors
  let sx = 2 / (maxX - minX);
  let sy = 2 / (maxY - minY);

  for( let i = 0; i < sides; i++ ){
    x = points[2 * i ] = points[2 * i ] * sx;
    y = points[2 * i + 1] = points[2 * i + 1] * sy;

    minX = Math.min( minX, x );
    maxX = Math.max( maxX, x );
    minY = Math.min( minY, y );
    maxY = Math.max( maxY, y );
  }

  if( minY < -1 ){
    for( let i = 0; i < sides; i++ ){
      y = points[2 * i + 1] = points[2 * i + 1] + (-1 - minY);
    }
  }

  return points;
};

export const generateUnitNgonPoints = ( sides, rotationRadians ) => {

  let increment = 1.0 / sides * 2 * Math.PI;
  let startAngle = sides % 2 === 0 ?
    Math.PI / 2.0 + increment / 2.0 : Math.PI / 2.0;

  startAngle += rotationRadians;

  let points = new Array( sides * 2 );

  let currentAngle;
  for( let i = 0; i < sides; i++ ){
    currentAngle = i * increment + startAngle;

    points[2 * i ] = Math.cos( currentAngle ); // x
    points[2 * i + 1] = Math.sin( -currentAngle ); // y
  }

  return points;
};

// Set the default radius, unless half of width or height is smaller than default
export const getRoundRectangleRadius = ( width, height ) =>
  Math.min( width / 4, height / 4, 8 );

// Set the default radius
export const getRoundPolygonRadius = (width, height ) =>
    Math.min( width / 10, height / 10, 8 );

export const getCutRectangleCornerLength = () => 8;

export const bezierPtsToQuadCoeff = ( p0, p1, p2 ) => [
  p0 - 2 * p1 + p2,
  2 * ( p1 - p0 ),
  p0
];

// get curve width, height, and control point position offsets as a percentage of node height / width
export const getBarrelCurveConstants = ( width, height ) => ({
  heightOffset: Math.min(15, 0.05 * height),
  widthOffset: Math.min(100, 0.25 * width),
  ctrlPtOffsetPct: 0.05
});

// Separating Axis Theorem (SAT) to determine if two polygons intersect. 
// The function takes two polygons as input and returns a boolean value indicating 
// whether the two polygons intersect.
export function satPolygonIntersection(poly1, poly2) {
  function getAxes(polygon) {
      let axes = [];
      for (let i = 0; i < polygon.length; i++) {
          let p1 = polygon[i];
          let p2 = polygon[(i + 1) % polygon.length];
          let edge = { x: p2.x - p1.x, y: p2.y - p1.y };
          let normal = { x: -edge.y, y: edge.x };
          let length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
          axes.push({ x: normal.x / length, y: normal.y / length });
      }
      return axes;
  }

  function project(polygon, axis) {
      let min = Infinity;
      let max = -Infinity;
      for (let point of polygon) {
          let projection = point.x * axis.x + point.y * axis.y;
          min = Math.min(min, projection);
          max = Math.max(max, projection);
      }
      return { min, max };
  }

  function overlaps(proj1, proj2) {
      return !(proj1.max < proj2.min || proj2.max < proj1.min);
  }

  let axes = [...getAxes(poly1), ...getAxes(poly2)];

  for (let axis of axes) {
      let proj1 = project(poly1, axis);
      let proj2 = project(poly2, axis);
      if (!overlaps(proj1, proj2)) {
          return false; // No overlap, so the polygons do not intersect
      }
  }

  return true; // polygons intersect
}

