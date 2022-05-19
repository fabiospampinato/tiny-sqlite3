
/* IMPORT */

import {isArrayBuffer, isBoolean, isDate, isFinite, isNil, isNumber, isSharedArrayBuffer, isString, isUint8Array, isUint8ClampedArray} from 'is';
import {Buffer} from 'node:buffer';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import once from 'once';
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

const ensureFileSync = ( filePath: string ): void => {

  if ( fs.existsSync ( filePath ) ) return;

  const folderPath = path.dirname ( filePath );

  try {

    ensureFolderSync ( folderPath );
    fs.writeFileSync ( filePath, '' );

  } catch {}

};

const ensureFolderSync = ( folderPath: string ): void => {

  fs.mkdirSync ( folderPath, { recursive: true } );

};

const escape = ( value: unknown ): string | number => {

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

  if ( isUint8Array ( value ) || isUint8ClampedArray ( value ) || isArrayBuffer ( value ) || isSharedArrayBuffer ( value ) ) {

    return `x'${Buffer.from ( value ).toString ( 'hex' )}'`;

  }

  throw new Error ( `unsupported "${typeof value}" value` );

};

const getDatabasePlatformBin = once ((): string => {

  const dirname = new URL ( '.', import.meta.url ).pathname;
  const platform = os.platform ();
  const arch = ( os.arch () === 'arm64' ) ? 'arm64' : 'x86';
  const ext = ( platform === 'win32' ) ? '.exe' : '';
  const binary = `sqlite3-${platform}-${arch}${ext}`;
  const bin = path.join ( dirname, '..', 'resources', 'binaries', binary );

  return bin;

});

const getDatabaseBin = ( bin?: string ): string => {

  if ( !bin ) return getDatabasePlatformBin ();

  return bin;

};

const getDatabaseMemoryPath = (): string => {

  return getTempPath ();

};

const getDatabasePath = ( db: Database | Uint8Array | Uint8ClampedArray | string ): string => {

  if ( db instanceof Database ) {

    return db.name;

  }

  if ( isUint8Array ( db ) || isUint8ClampedArray ( db ) ) {

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

/* EXPORT */

export {builder, ensureFileSync, escape, getDatabaseBin, getDatabasePath, getTempPath};
