
/* IMPORT */

import Hex from 'hex-encoding';
import {isBoolean, isDate, isFinite, isNil, isNumber, isString, isUint8Array} from '../utils/lang';
import Raw from './raw';

/* MAIN */

const Builder = {

  /* API */

  build: ( statics: TemplateStringsArray, dynamics: unknown[] ): string => {

    let query = statics[0];

    for ( let i = 1, l = statics.length; i < l; i++ ) {

      query += Builder.escape ( dynamics[i - 1] );
      query += statics[i];

    }

    return query;

  },

  escape: ( value: unknown ): string | number => {

    if ( isString ( value ) ) {

      return `'${value.replaceAll ( `'`, `''` )}'`;

    }

    if ( isNumber ( value ) && isFinite ( value ) ) {

      return Number ( value );

    }

    if ( isBoolean ( value ) ) {

      return Number ( value );

    }

    if ( isNil ( value ) ) {

      return 'NULL';

    }

    if ( value instanceof Raw ) {

      return value.get ();

    }

    if ( isDate ( value ) ) {

      return `'${value.toISOString ()}'`;

    }

    if ( isUint8Array ( value ) ) {

      return `x'${Hex.encode ( value )}'`;

    }

    throw new Error ( `Unsupported "${typeof value}" value` );

  }

};

/* EXPORT */

export default Builder;
