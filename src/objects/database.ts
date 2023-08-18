
/* IMPORT */

import whenExit from 'when-exit';
import {MEMORY_DATABASE, TEMPORARY_DATABASE, NULL_PATH, PAGE_SIZE, UNRESOLVABLE} from '../constants';
import {getDatabaseBin, getDatabasePath} from '../utils/database';
import {ensureFileSync, ensureFileUnlink, ensureFileUnlinkSync, getTempPath, readFile} from '../utils/fs';
import {isUint8Array} from '../utils/lang';
import Builder from './builder';
import Executor from './executor';
import Raw from './raw';
import type {Info, Options, Stats} from '../types';

/* MAIN */

//TODO: Support WASM and make this interface isomorphic
//TODO: Support bundling, somehow
//TODO: Support an ARM64 build for Windows (the current one is just a copy of the x86 one)
//TODO: Support a singletone mode, where .open is used to change DB on the same process
//TODO: Support a TTL parameter, for auto-disposing of unnecessary processes
//TODO: Support a pooling mode, where a maximum number of processes is spawned and reused

class Database {

  /* VARIABLES */

  public path: string;
  public memory: boolean;
  public readonly: boolean;
  public temporary: boolean;
  public batching: boolean;
  public transacting: boolean;

  private batched: string[];
  private executor: Executor;

  /* CONSTRUCTOR */

  constructor ( db: Uint8Array | string, options: Options = {} ) {

    const bin = options.bin || getDatabaseBin ();
    const path = getDatabasePath ( db );
    const memory = ( db === MEMORY_DATABASE );
    const temporary = ( db === TEMPORARY_DATABASE || isUint8Array ( db ) );
    const args = [path];

    if ( !memory ) {

      ensureFileSync ( path );

    }

    if ( options.limit ) {

      const maxPageCount = Math.ceil ( options.limit / PAGE_SIZE );

      args.push ( '-cmd', `.output ${NULL_PATH}`, '-cmd', `PRAGMA page_size=${PAGE_SIZE}`, '-cmd', `PRAGMA max_page_count=${maxPageCount}`, '-cmd', '.output' );

    } else {

      args.push ( '-cmd', `.output ${NULL_PATH}`, '-cmd', `PRAGMA page_size=${PAGE_SIZE}`, '-cmd', '.output' );

    }

    if ( options.readonly ) {

      args.push ( '-readonly' );

    }

    if ( options.timeout ) {

      args.push ( '-cmd', `.timeout ${options.timeout}` );

    }

    if ( options.wal ) {

      args.push ( '-cmd', `.output ${NULL_PATH}`, '-cmd', 'PRAGMA synchronous=NORMAL', '-cmd', 'PRAGMA journal_mode=WAL', '-cmd', '.output' );

    }

    if ( options.args ) {

      args.push ( ...options.args );

    }

    this.path = path;
    this.memory = memory;
    this.readonly = !!options.readonly;
    this.temporary = temporary;
    this.batching = false;
    this.transacting = false;

    this.batched = [];
    this.executor = new Executor ( bin, args, this.close );

    whenExit ( this.close );

  }

  /* API */

  backup = async ( filePath: string ): Promise<void> => {

    await this.json`.backup ${filePath}`;

  };

  batch = async ( fn: () => void ): Promise<void> => {

    if ( this.batching ) throw new Error ( 'Nested batches are not supported' );

    try {

      this.batching = true;
      this.batched = [];

      await fn ();

      if ( this.batched.length ) {

        const query = this.batched.join ( '\n;\n' );

        await this.executor.exec ( query, true );

      }

    } finally {

      this.batching = false;
      this.batched = [];

    }

  };

  close = (): void => {

    this.executor.close ();

    if ( this.temporary ) {

      ensureFileUnlinkSync ( this.path );

    }

  };

  info = async (): Promise<Info> => {

    const infoRaw = await this.json`.dbinfo`;
    const info = Object.fromEntries ( infoRaw.split ( /\r?\n/ ).filter ( line => line ).map ( line => line.split ( ':' ).map ( key => key.trim () ) ) );

    return info;

  };

  json = ( strings: TemplateStringsArray, ...expressions: unknown[] ): Promise<string> => {

    const query = Builder.build ( strings, expressions );

    if ( this.batching ) {

      this.batched.push ( query );

      return UNRESOLVABLE;

    } else {

      return this.executor.exec ( query, false, true );

    }

  };

  pid = (): number | undefined => {

    return this.executor.process?.pid;

  };

  raw = ( value: string ): Raw => {

    return new Raw ( value );

  };

  recover = async (): Promise<string> => {

    return await this.json`.recover`;

  };

  serialize = async (): Promise<Uint8Array> => {

    const temp = getTempPath ();

    await this.backup ( temp );

    const uint8 = await readFile ( temp );

    await ensureFileUnlink ( temp );

    return uint8;

  };

  size = async (): Promise<number> => {

    const result = await this.sql`SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()`;

    return result[0].size;

  };

  sql = <T = any> ( strings: TemplateStringsArray, ...expressions: unknown[] ): Promise<T> => {

    const query = Builder.build ( strings, expressions );

    if ( this.batching ) {

      this.batched.push ( query );

      return UNRESOLVABLE;

    } else {

      return this.executor.exec<T> ( query );

    }

  };

  stats = async (): Promise<Stats> => {

    const statsRaw = await this.json`.stats`;
    const stats = Object.fromEntries ( statsRaw.split ( /\r?\n/ ).filter ( line => line ).map ( line => line.split ( ':' ).map ( key => key.trim () ) ) );

    return stats;

  };

  transaction = async ( fn: () => void ): Promise<boolean> => {

    if ( this.transacting ) throw new Error ( 'Nested transactions are not supported' );

    try {

      this.transacting = true;

      await this.json`BEGIN TRANSACTION`;

      await fn ();

      await this.json`COMMIT`;

      return true;

    } catch {

      await this.json`ROLLBACK TRANSACTION`;

      return false;

    } finally {

      this.transacting = false;

    }

  };

}

/* EXPORT */

export default Database;
