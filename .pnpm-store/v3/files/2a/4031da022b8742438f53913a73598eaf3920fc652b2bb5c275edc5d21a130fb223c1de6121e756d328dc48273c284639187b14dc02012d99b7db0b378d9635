
/* IMPORT */

import {TYPE} from '~/constants';

/* MAIN */

class Type {

  /* VARIABLES */

  type: number = TYPE.ALL;

  /* API */

  get (): number {

    return this.type;

  }

  set ( type: number ): void {

    if ( this.type && this.type !== type ) throw new Error ( 'Cannot change both RGB and HSL channels at the same time' );

    this.type = type;

  }

  reset (): void {

    this.type = TYPE.ALL;

  }

  is ( type: number ): boolean {

    return this.type === type;

  }

}

/* EXPORT */

export default Type;
