
/* IMPORT */

import type {Callback} from '../types';

/* MAIN */

// This is only accurate within a TTL window, for performance/simplicity

class Autocloser {

  /* VARIABLES */

  intervalId?: ReturnType<typeof setInterval>;
  intervalStart: number = 0;
  ttl: number;
  onClose: Callback;

  /* CONSTRUCTOR */

  constructor ( ttl: number, onClose: Callback ) {

    this.ttl = ttl;
    this.onClose = onClose;

  }

  /* API */

  check = (): void => {

    const intervalEnd = Date.now ();

    if ( ( intervalEnd - this.intervalStart ) >= ( this.ttl + 1 ) ) { // Accounting for 1ms of fuzziness in the timer

      this.onClose ();

    }

  };

  start = (): void => {

    if ( this.ttl <= 0 || this.ttl === Infinity ) return;

    this.stop ();

    this.intervalId ||= setInterval ( this.check, this.ttl );
    this.intervalStart = Date.now ();

  };

  stop = (): void => {

    clearInterval ( this.intervalId );

    this.intervalId = undefined;
    this.intervalStart = 0;

  };

  pause = (): void => {

    this.intervalStart = Infinity;

  };

  resume = (): void => {

    this.intervalStart = Date.now ();

  };

}

/* EXPORT */

export default Autocloser;
