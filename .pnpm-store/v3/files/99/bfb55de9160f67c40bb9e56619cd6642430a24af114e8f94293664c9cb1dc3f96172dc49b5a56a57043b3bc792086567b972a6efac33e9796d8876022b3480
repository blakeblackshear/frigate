/*! Runge-Kutta spring physics function generator. Adapted from Framer.js, copyright Koen Bok. MIT License: http://en.wikipedia.org/wiki/MIT_License */
/* Given a tension, friction, and duration, a simulation at 60FPS will first run without a defined duration in order to calculate the full path. A second pass
   then adjusts the time delta -- using the relation between actual time and duration -- to calculate the path for the duration-constrained animation. */
let generateSpringRK4 = (function(){
  function springAccelerationForState( state ){
    return (-state.tension * state.x) - (state.friction * state.v);
  }

  function springEvaluateStateWithDerivative( initialState, dt, derivative ){
    let state = {
      x: initialState.x + derivative.dx * dt,
      v: initialState.v + derivative.dv * dt,
      tension: initialState.tension,
      friction: initialState.friction
    };

    return { dx: state.v, dv: springAccelerationForState( state ) };
  }

  function springIntegrateState( state, dt ){
    let a = {
      dx: state.v,
      dv: springAccelerationForState( state )
    },
    b = springEvaluateStateWithDerivative( state, dt * 0.5, a ),
    c = springEvaluateStateWithDerivative( state, dt * 0.5, b ),
    d = springEvaluateStateWithDerivative( state, dt, c ),
    dxdt = 1.0 / 6.0 * (a.dx + 2.0 * (b.dx + c.dx) + d.dx),
    dvdt = 1.0 / 6.0 * (a.dv + 2.0 * (b.dv + c.dv) + d.dv);

    state.x = state.x + dxdt * dt;
    state.v = state.v + dvdt * dt;

    return state;
  }

  return function springRK4Factory( tension, friction, duration ){

    let initState = {
      x: -1,
      v: 0,
      tension: null,
      friction: null
    },
    path = [0],
    time_lapsed = 0,
    tolerance = 1 / 10000,
    DT = 16 / 1000,
    have_duration, dt, last_state;

    tension = parseFloat( tension ) || 500;
    friction = parseFloat( friction ) || 20;
    duration = duration || null;

    initState.tension = tension;
    initState.friction = friction;

    have_duration = duration !== null;

    /* Calculate the actual time it takes for this animation to complete with the provided conditions. */
    if( have_duration ){
      /* Run the simulation without a duration. */
      time_lapsed = springRK4Factory( tension, friction );
      /* Compute the adjusted time delta. */
      dt = time_lapsed / duration * DT;
    } else {
      dt = DT;
    }

    for(;;){
      /* Next/step function .*/
      last_state = springIntegrateState( last_state || initState, dt );
      /* Store the position. */
      path.push( 1 + last_state.x );
      time_lapsed += 16;
      /* If the change threshold is reached, break. */
      if( !(Math.abs( last_state.x ) > tolerance && Math.abs( last_state.v ) > tolerance) ){
        break;
      }
    }

    /* If duration is not defined, return the actual time required for completing this animation. Otherwise, return a closure that holds the
       computed path and returns a snapshot of the position according to a given percentComplete. */
    return !have_duration ? time_lapsed : function( percentComplete ){ return path[ (percentComplete * (path.length - 1)) | 0 ]; };
  };
}());

export default generateSpringRK4;
