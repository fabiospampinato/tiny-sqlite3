
/* IMPORT */

import once from 'function-once';
import os from 'node:os';
import path from 'node:path';
import {MEMORY_DATABASE, TEMPORARY_DATABASE} from '../constants';
import Builder from '../objects/builder';
import Raw from '../objects/raw';
import {getTempPath, writeFileSync} from './fs';
import {isUint8Array} from './lang';

/* MAIN */

const getDatabaseBin = once ((): string => {

  const dirname = new URL ( '.', import.meta.url ).pathname;
  const platform = os.platform ();
  const arch = ( os.arch () === 'arm64' ) ? 'arm64' : 'x86';
  const ext = ( platform === 'win32' ) ? '.exe' : '';
  const binary = `sqlite3-${platform}-${arch}${ext}`;
  const bin = path.join ( dirname, '..', '..', 'resources', 'binaries', binary );

  return bin;

});

const getDatabasePath = ( db: Uint8Array | string ): string => {

  if ( db === MEMORY_DATABASE ) {

    return db;

  }

  if ( db === TEMPORARY_DATABASE ) {

    return getTempPath ();

  }

  if ( isUint8Array ( db ) ) {

    const tempPath = getTempPath ();

    writeFileSync ( tempPath, db );

    return tempPath;

  }

  return path.resolve ( db );

};

const raw = ( value: string ): Raw => {

  return new Raw ( value );

};

const sql = ( strings: TemplateStringsArray, ...expressions: unknown[] ): string => {

  return Builder.build ( strings, expressions );

};

/* EXPORT */

export {getDatabaseBin, getDatabasePath, raw, sql};
