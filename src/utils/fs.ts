
/* IMPORT */

import os from 'node:os';
import path from 'node:path';
import fs from 'stubborn-fs';
import zeptoid from 'zeptoid';

/* MAIN */

const ensureFileSync = ( filePath: string ): void => {

  if ( fs.attempt.existsSync ( filePath ) ) return;

  const folderPath = path.dirname ( filePath );

  try {

    ensureFolderSync ( folderPath );
    writeFileSync ( filePath, '' );

  } catch {}

};

const ensureFileUnlink = ( filePath: string ): Promise<void> => {

  return fs.attempt.unlink ( filePath );

};

const ensureFileUnlinkSync = ( filePath: string ): void => {

  return fs.attempt.unlinkSync ( filePath );

};

const ensureFolderSync = ( folderPath: string ): void => {

  fs.attempt.mkdirSync ( folderPath, { recursive: true } );

};

const getTempPath = (): string => {

  return path.join ( os.tmpdir (), zeptoid () );

};

const readFile = async ( filePath: string ): Promise<Uint8Array> => {

  const buffer = await fs.retry.readFile ( 5000 )( filePath );
  const uint8 = new Uint8Array ( buffer, buffer.byteOffset, buffer.byteLength );

  return uint8;

};

const writeFile = async ( filePath: string, content: Uint8Array | string ): Promise<void> => {

  return fs.retry.writeFile ( 5000 )( filePath, content );

};

const writeFileSync = ( filePath: string, content: Uint8Array | string ): void => {

  return fs.retry.writeFileSync ( 1000 )( filePath, content );

};

/* EXPORT */

export {ensureFileSync, ensureFileUnlink, ensureFileUnlinkSync, ensureFolderSync, getTempPath, readFile, writeFile, writeFileSync};
