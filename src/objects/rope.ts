
/* IMPORT */

import {Buffer} from 'node:buffer';

/* MAIN */

// This class exists just to avoid concatenating large string or buffer chunks, which if there are many of them will cause a major performance issue

class Rope {

  /* VARIABLES */

  private chunks: Buffer[] = [];

  /* API */

  concat (): Buffer {

    return Buffer.concat ( this.chunks );

  }

  endsWith ( value: Uint8Array ): boolean {

    if ( !value.length ) return true;

    let vi = value.length - 1;

    for ( let ci = this.chunks.length - 1; ci >= 0; ci-- ) {

      const chunk = this.chunks[ci];

      for ( let si = chunk.length - 1; si >= 0; si-- ) {

        if ( value[vi] !== chunk[si] ) return false;

        vi -= 1;

        if ( vi < 0 ) return true;

      }

    }

    return false;

  }

  push ( chunk: Buffer ): void {

    this.chunks.push ( chunk );

  }

  toString (): string {

    return this.concat ().toString ( 'utf8' );

  }

}

/* EXPORT */

export default Rope;
