
/* IMPORT */

import {Buffer} from 'node:buffer';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {MEMORY_DATABASE} from '~/constants';
import Database from '~/objects/database';
import Error from '~/objects/error';
import Raw from '~/objects/raw';

/* MAIN */

const builder = ( statics: TemplateStringsArray, dynamics: unknown[] ): string => {

  let query = statics[0];

  for ( let i = 1, l = statics.length; i < l; i++ ) {

    query += escape ( dynamics[i - 1] );
    query += statics[i];

  }

  return query;

};

const escape = ( value: unknown ): string | number => {

  if ( typeof value === 'string' ) {

    return `'${value.replaceAll ( `'`, `''` )}'`;

  }

  if ( typeof value === 'number' && isFinite ( value ) ) {

    return Number ( value );

  }

  if ( typeof value === 'boolean' ) {

    return Number ( value );

  }

  if ( value === null || value === undefined ) {

    return 'NULL';

  }

  if ( value instanceof Raw ) {

    return value.get ();

  }

  if ( value instanceof Date ) {

    return escape ( value.toISOString () );

  }

  if ( value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof ArrayBuffer ) {

    return `x'${Buffer.from ( value ).toString ( 'hex' )}'`;

  }

  throw new Error ( `incompatible "${typeof value}" value` );

};

const getDatabasePlatformBin = (() => {

  //TODO: Support bundling

  let cached: string | undefined;

  return (): string => {

    if ( cached ) return cached;

    const dirname = new URL ( '.', import.meta.url ).pathname;
    const platform = os.platform ();
    const ext = ( platform === 'win32' ) ? '.exe' : '';
    const bin = path.join ( dirname, '..', 'resources', 'binaries', platform, `sqlite3${ext}` );

    fs.chmodSync ( bin, 0o755 ); // Ensuring the binary is actually executable

    return cached = bin;

  };

})();

const getDatabaseBin = ( bin?: string ): string => {

  if ( !bin ) return getDatabasePlatformBin ();

  return bin;

};

const getDatabaseMemoryPath = (): string => {

  return getTempPath ();

};

const getDatabasePath = ( db: Database | Uint8Array | string ): string => {

  if ( db instanceof Database ) {

    return db.name;

  }

  if ( db instanceof Uint8Array ) {

    const temp = getTempPath ();

    fs.writeFileSync ( temp, db );

    return temp;

  }

  if ( db === MEMORY_DATABASE ) {

    return getDatabaseMemoryPath ();

  }

  return path.resolve ( db );

};

const getTempPath = (): string => {

  return path.join ( os.tmpdir (), randomUUID () );

};

const makeNakedPromise = <T = unknown> () => {

  let resolve!: ( value: T ) => void;
  let reject!: ( error: Error ) => void;

  const promise = new Promise<T> ( ( res, rej ) => {
    resolve = res;
    reject = rej;
  });

  return {promise, resolve, reject};

};

/* EXPORT */

export {builder, escape, getDatabaseBin, getDatabasePath, getTempPath, makeNakedPromise};
