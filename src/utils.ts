
/* IMPORT */

import os from 'node:os';
import path from 'node:path';
import fs from 'stubborn-fs';
import zeptoid from 'zeptoid';
import {MEMORY_DATABASE, TEMPORARY_DATABASE} from './constants';

/* MAIN */

const ensureFileSync = ( filePath: string, content: Uint8Array | string = '' ): void => {

  if ( fs.attempt.existsSync ( filePath ) ) return;

  const folderPath = path.dirname ( filePath );

  try {

    ensureFolderSync ( folderPath );
    writeFileSync ( filePath, content );

  } catch {}

};

const ensureFileUnlinkSync = ( filePath: string ): void => {

  return fs.attempt.unlinkSync ( filePath );

};

const ensureFolderSync = ( folderPath: string ): void => {

  fs.attempt.mkdirSync ( folderPath, { recursive: true } );

};

const getDatabasePath = ( db: Uint8Array | string ): string => {

  if ( db === MEMORY_DATABASE ) {

    return db;

  } else if ( db === TEMPORARY_DATABASE ) {

    return getTempPath ();

  } else if ( isUint8Array ( db ) ) {

    return getTempPath ( db );

  } else {

    return path.resolve ( db );

  }

};

const getTempPath = ( content?: Uint8Array | string ): string => {

  const tempPath = path.join ( os.tmpdir (), `sqlite-${zeptoid ()}.db` );

  ensureFileSync ( tempPath, content );

  return tempPath;

};

const isUint8Array = ( value: unknown ): value is Uint8Array => {

  return value instanceof Uint8Array;

};

const noop = (): void => {

  return;

};

const writeFileSync = ( filePath: string, content: Uint8Array | string ): void => {

  return fs.retry.writeFileSync ( 1000 )( filePath, content );

};

/* EXPORT */

export {ensureFileSync, ensureFileUnlinkSync, ensureFolderSync, getDatabasePath, getTempPath, isUint8Array, noop, writeFileSync};
