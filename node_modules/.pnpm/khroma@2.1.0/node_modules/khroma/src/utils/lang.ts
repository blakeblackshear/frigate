
/* MAIN */

const Lang = {

  /* API */

  clamp: ( number: number, lower: number, upper: number ): number => {

    if ( lower > upper ) return Math.min ( lower, Math.max ( upper, number ) );

    return Math.min ( upper, Math.max ( lower, number ) );

  },

  round: ( number: number ): number => { // 10 digits rounding

    return Math.round ( number * 10000000000 ) / 10000000000;

  }

};

/* EXPORT */

export default Lang;
