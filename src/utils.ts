
/* IMPORT */

import Hex from 'hex-encoding';
import {isBoolean, isDate, isError, isFinite, isNil, isNumber, isString, isUint8Array} from 'is';
import os from 'node:os';
import path from 'node:path';
import once from 'once';
import fs from 'stubborn-fs';
import zeptoid from 'zeptoid';
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

const castError = ( error: unknown ): Error => {

  if ( isError ( error ) ) return new Error ( error.message );

  if ( isString ( error ) ) return new Error ( error );

  return new Error ( 'unknown error' );

};

const delay = ( ms: number ): Promise<void> => {

  return new Promise ( resolve => {

    setTimeout ( resolve, ms );

  });

};

const ensureFileSync = ( filePath: string ): void => {

  if ( fs.attempt.existsSync ( filePath ) ) return;

  const folderPath = path.dirname ( filePath );

  try {

    ensureFolderSync ( folderPath );

    fs.retry.writeFileSync ( 1000 )( filePath, '' );

  } catch {}

};

const ensureFileUnlink = ( filePath: string ): Promise<void> => {

  return fs.attempt.unlink ( filePath );

};

const ensureFileUnlinkSync = ( filePath: string ): void => {

  fs.attempt.unlinkSync ( filePath );

};

const ensureFolderSync = ( folderPath: string ): void => {

  fs.attempt.mkdirSync ( folderPath, { recursive: true } );

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

  if ( isUint8Array ( value ) ) {

    return `x'${Hex.encode ( value )}'`;

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

const getDatabasePath = ( db: Database | Uint8Array | string ): string => {

  if ( db instanceof Database ) {

    return db.name;

  }

  if ( isUint8Array ( db ) ) {

    const temp = getTempPath ();

    fs.retry.writeFileSync ( 1000 )( temp, db );

    return temp;

  }

  if ( db === MEMORY_DATABASE ) {

    return getDatabaseMemoryPath ();

  }

  return path.resolve ( db );

};

const getTempPath = (): string => {

  return path.join ( os.tmpdir (), zeptoid () );

};

const readFileBuffer = async ( filePath: string ): Promise<Uint8Array> => {

  const buffer = await fs.retry.readFile ( 5000 )( filePath );
  const uint8 = new Uint8Array ( buffer, buffer.byteOffset, buffer.byteLength );

  return uint8;

};

const readFileString = ( filePath: string ): Promise<string> => {

  return fs.retry.readFile ( 5000 )( filePath, 'utf8' );

};

/* EXPORT */

export {builder, castError, delay, ensureFileSync, ensureFileUnlink, ensureFileUnlinkSync, ensureFolderSync, getDatabaseBin, getDatabasePath, getTempPath, readFileBuffer, readFileString};
