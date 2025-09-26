// Fragment shader functions to calculate signed distance
// https://iquilezles.org/articles/distfunctions2d/
// ellipse: https://www.shadertoy.com/view/4lsXDN 

/**
 * param p - point
 * float r - circle radius, eg 0.5 for unit circle
 */
export const circleSD = `
  float circleSD(vec2 p, float r) {
    return distance(vec2(0), p) - r; // signed distance
  }
`;

/**
 * param p - point
 * param b - b.x = half width, b.y = half height
 */
export const rectangleSD = `
  float rectangleSD(vec2 p, vec2 b) {
    vec2 d = abs(p)-b;
    return distance(vec2(0),max(d,0.0)) + min(max(d.x,d.y),0.0);
  }
`;

/**
 * param p - point
 * param b - b.x = half width, b.y = half height
 * param cr - vector of corner radiuses
 */
export const roundRectangleSD = `
  float roundRectangleSD(vec2 p, vec2 b, vec4 cr) {
    cr.xy = (p.x > 0.0) ? cr.xy : cr.zw;
    cr.x  = (p.y > 0.0) ? cr.x  : cr.y;
    vec2 q = abs(p) - b + cr.x;
    return min(max(q.x, q.y), 0.0) + distance(vec2(0), max(q, 0.0)) - cr.x;
  }
`;

/**
 * param p - point
 * param ab - a.x = horizontal radius, a.y = vertical radius
 */
export const ellipseSD = `
  float ellipseSD(vec2 p, vec2 ab) {
    p = abs( p ); // symmetry

    // find root with Newton solver
    vec2 q = ab*(p-ab);
    float w = (q.x<q.y)? 1.570796327 : 0.0;
    for( int i=0; i<5; i++ ) {
      vec2 cs = vec2(cos(w),sin(w));
      vec2 u = ab*vec2( cs.x,cs.y);
      vec2 v = ab*vec2(-cs.y,cs.x);
      w = w + dot(p-u,v)/(dot(p-u,u)+dot(v,v));
    }
    
    // compute final point and distance
    float d = length(p-ab*vec2(cos(w),sin(w)));
    
    // return signed distance
    return (dot(p/ab,p/ab)>1.0) ? d : -d;
  }
`;

