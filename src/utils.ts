
/* IMPORT */

import os from 'node:os';
import path from 'node:path';
import fs from 'stubborn-fs';
import zeptoid from 'zeptoid';
import {MEMORY_DATABASE, TEMPORARY_DATABASE} from './constants';

/* MAIN */

const ensureFileSync = ( filePath: string ): void => {

  if ( fs.attempt.existsSync ( filePath ) ) return;

  const folderPath = path.dirname ( filePath );

  try {

    ensureFolderSync ( folderPath );
    writeFileSync ( filePath, '' );

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

  } else if ( db === TEMPORARY_DATABASE || isUint8Array ( db ) ) {

    return getTempPath ();

  } else {

    return path.resolve ( db );

  }

};

const getTempPath = (): string => {

  const tempPath = path.join ( os.tmpdir (), `sqlite-${zeptoid ()}.db` );

  ensureFileSync ( tempPath );

  return tempPath;

};

const isUint8Array = ( value: unknown ): value is Uint8Array => {

  return value instanceof Uint8Array;

};

const writeFileSync = ( filePath: string, content: Uint8Array | string ): void => {

  return fs.retry.writeFileSync ( 1000 )( filePath, content );

};

/* EXPORT */

export {ensureFileSync, ensureFileUnlinkSync, ensureFolderSync, getDatabasePath, getTempPath, isUint8Array, writeFileSync};
