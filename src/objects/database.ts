
/* IMPORT */

import whenExit from 'when-exit';
import {MEMORY_DATABASE, TEMPORARY_DATABASE, NULL_PATH, PAGE_SIZE, PAGES_COUNT, UNRESOLVABLE} from '../constants';
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

  private bin: string;
  private args: string[];
  private batched: string[];
  private executor: Executor;

  /* CONSTRUCTOR */

  constructor ( db: Uint8Array | string, options: Options = {} ) {

    this.bin = options.bin || getDatabaseBin ();
    this.path = getDatabasePath ( db );
    this.args = [this.path];
    this.batched = [];

    this.memory = ( db === MEMORY_DATABASE );
    this.readonly = !!options.readonly;
    this.temporary = ( db === TEMPORARY_DATABASE || isUint8Array ( db ) );
    this.batching = false;
    this.transacting = false;

    if ( !this.memory ) {

      ensureFileSync ( this.path );

    }

    if ( options.page || options.size ) {

      const page = options.page || PAGE_SIZE;
      const size = options.size || ( page * PAGES_COUNT );
      const maxPageCount = Math.ceil ( size / page );

      this.args.push ( '-cmd', `.output ${NULL_PATH}`, '-cmd', `PRAGMA page_size=${page}`, '-cmd', `PRAGMA max_page_count=${maxPageCount}`, '-cmd', '.output' );

    } else {

      this.args.push ( '-cmd', `.output ${NULL_PATH}`, '-cmd', `PRAGMA page_size=${PAGE_SIZE}`, '-cmd', `PRAGMA max_page_count=${PAGES_COUNT}`, '-cmd', '.output' );

    }

    if ( options.readonly ) {

      this.args.push ( '-readonly' );

    }

    if ( options.timeout ) {

      this.args.push ( '-cmd', `.timeout ${options.timeout}` );

    }

    if ( options.wal ) {

      this.args.push ( '-cmd', `.output ${NULL_PATH}`, '-cmd', 'PRAGMA synchronous=NORMAL', '-cmd', 'PRAGMA journal_mode=WAL', '-cmd', '.output' );

    }

    if ( options.args ) {

      this.args.push ( ...options.args );

    }

    this.executor = new Executor ( this.bin, this.args, this.close );

    whenExit ( this.close );

  }

  /* API */

  backup = ( filePath: string ): Promise<void> => {

    return this.query ( `.backup '${filePath}'`, 'null' );

  };

  batch = async ( fn: () => void ): Promise<void> => {

    if ( this.batching ) throw new Error ( 'Nested batches are not supported' );

    try {

      this.batching = true;
      this.batched = [];

      await fn ();

      if ( this.batched.length ) {

        const query = this.batched.join ( '\n;\n' );

        await this.executor.exec ( query, 'null' );

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

  dump = (): Promise<string> => {

    return this.query ( '.dump', 'json' );

  };

  info = async (): Promise<Info> => {

    const infoRaw = await this.query ( '.dbinfo', 'json' );
    const info = Object.fromEntries ( infoRaw.split ( /\r?\n/ ).filter ( line => line ).map ( line => line.split ( ':' ).map ( key => key.trim () ) ) );

    return info;

  };

  pid = (): number | undefined => {

    return this.executor.process?.pid;

  };

  query ( query: string, mode: 'null' ): Promise<void>;
  query ( query: string, mode: 'json' ): Promise<string>;
  query <T = any> ( query: string, mode?: 'parse' ): Promise<T | []>;
  query <T = any> ( query: string, mode: 'null' | 'json' | 'parse' = 'parse' ): Promise<T | [] | string | void> {

    if ( this.batching ) {

      this.batched.push ( query );

      return UNRESOLVABLE;

    } else {

      return this.executor.exec ( query, mode );

    }

  };

  raw = ( value: string ): Raw => {

    return new Raw ( value );

  };

  recover = (): Promise<string> => {

    return this.query ( '.recover', 'json' );

  };

  serialize = async (): Promise<Uint8Array> => {

    const temp = getTempPath ();

    await this.backup ( temp );

    const uint8 = await readFile ( temp );

    await ensureFileUnlink ( temp );

    return uint8;

  };

  size = async (): Promise<number> => {

    const result = await this.query ( 'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()' );

    return result[0].size;

  };

  sql = <T = any> ( strings: TemplateStringsArray, ...expressions: unknown[] ): Promise<T | []> => {

    const query = Builder.build ( strings, expressions );

    return this.query ( query );

  };

  stats = async (): Promise<Stats> => {

    const statsRaw = await this.query ( '.stats', 'json' );
    const stats = Object.fromEntries ( statsRaw.split ( /\r?\n/ ).filter ( line => line ).map ( line => line.split ( ':' ).map ( key => key.trim () ) ) );

    return stats;

  };

  transaction = async ( fn: () => void ): Promise<boolean> => {

    if ( this.transacting ) throw new Error ( 'Nested transactions are not supported' );

    try {

      this.transacting = true;

      await this.query ( 'BEGIN TRANSACTION', 'null' );

      await fn ();

      await this.query ( 'COMMIT', 'null' );

      return true;

    } catch {

      await this.query ( 'ROLLBACK TRANSACTION', 'null' );

      return false;

    } finally {

      this.transacting = false;

    }

  };

}

/* EXPORT */

export default Database;
