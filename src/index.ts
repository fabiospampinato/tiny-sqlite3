
/* IMPORT */

import sqlite3 from 'better-sqlite3';
import buffer2uint8 from 'buffer2uint8';
import whenExit from 'when-exit';
import {MEMORY_DATABASE, TEMPORARY_DATABASE, PAGE_SIZE, PAGES_COUNT} from './constants';
import {getDatabasePath, isUint8Array, ensureFileSync, ensureFileUnlinkSync, noop} from './utils';
import type {Callback, Dict, Disposer, DatabaseOptions, FunctionOptions, In, Out} from './types';

/* MAIN */

//TODO: ttl -> autocloser (maybe on a PooledDatabase class or something)
//TODO: .dump
//TODO: .recover
//TODO: Optimize performance by tweaking pragmas

class Database {

  /* VARIABLES */

  public path: string;
  public memory: boolean;
  public readonly: boolean;
  public temporary: boolean;

  private options: DatabaseOptions;
  private sqlite3?: sqlite3.Database;
  private statements: Record<string, ( params?: any ) => any[]> = {};
  private exitDisposer: Disposer = noop;

  /* CONSTRUCTOR */

  constructor ( path: Uint8Array | string, options: DatabaseOptions = {} ) {

    this.path = getDatabasePath ( path );
    this.memory = ( path === MEMORY_DATABASE );
    this.readonly = !!options.readonly;
    this.temporary = ( path === TEMPORARY_DATABASE || isUint8Array ( path ) );
    this.options = options;

  }

  /* GETTERS API */

  private get db (): sqlite3.Database {

    return this.open ();

  }

  get changes (): number {

    return this.query<{ value: number }>( 'SELECT changes() as value' )[0].value;

  }

  get lastInsertRowId (): number {

    return this.query<{ value: number }>( 'SELECT last_insert_rowid() as value' )[0].value;

  }

  get size (): number {

    return this.query<{ value: number }>( 'SELECT page_count * page_size as value FROM pragma_page_count(), pragma_page_size()' )[0].value;

  }

  get totalChanges (): number {

    return this.query<{ value: number }>( 'SELECT total_changes() as value' )[0].value;

  }

  get transacting (): boolean {

    return this.db.inTransaction;

  }

  /* API */

  backup ( path: string ): Promise<void> {

    return this.db.backup ( path ).then ( noop );

  }

  close (): void {

    if ( !this.sqlite3 ) return;

    this.exitDisposer ();

    this.db.close ();

    this.sqlite3 = undefined;

    if ( this.temporary ) {

      ensureFileUnlinkSync ( this.path );

    }

  }

  execute ( sql: string ): void {

    this.db.exec ( sql );

  }

  function ( name: string, fn: ( ...args: unknown[] ) => unknown, options: FunctionOptions = {} ): Disposer {

    const config: sqlite3.RegistrationOptions = {
      deterministic: !!options.deterministic,
      directOnly: !!options.direct,
      varargs: !!options.variadic
    };

    this.db.function ( name, config, fn );

    return (): void => {

      this.db.function ( name, config, () => {

        throw new Error ( `no such function: ${name}` );

      });

    };

  }

  open (): sqlite3.Database {

    if ( this.sqlite3 ) return this.sqlite3;

    if ( !this.memory ) {
      ensureFileSync ( this.path );
    }

    const db = this.sqlite3 = new sqlite3 ( this.path, {
      nativeBinding: this.options.bin,
      readonly: this.readonly,
      timeout: this.options.timeout ?? 600_000
    });

    if ( this.options.page || this.options.size ) {
      const page = this.options.page || PAGE_SIZE;
      const size = this.options.size || ( page * PAGES_COUNT );
      const maxPageCount = Math.ceil ( size / page );
      db.exec ( `PRAGMA page_size=${page}` );
      db.exec ( `PRAGMA max_page_count=${maxPageCount}` );
    } else {
      db.exec ( `PRAGMA page_size=${PAGE_SIZE}` );
      db.exec ( `PRAGMA max_page_count=${PAGES_COUNT}` );
    }

    if ( this.options.wal ) {
      db.exec ( 'PRAGMA synchronous=NORMAL' );
      db.exec ( 'PRAGMA journal_mode=WAL' );
    }

    db.exec ( 'PRAGMA temp_store=MEMORY' );

    this.exitDisposer = whenExit ( () => this.close () );

    return db;

  }

  prepare<R extends Dict<Out> = Dict<Out>, P extends Array<In> | Dict<In> = Array<In> | Dict<In>> ( sql: string ): (( params?: P ) => R[]) {

    return this.statements[sql] ||= (() => {

      const statement = this.db.prepare<P[]>( sql );

      return ( params?: P ) => {

        if ( statement.reader ) {

          return params ? statement.all ( params ) : statement.all ();

        } else {

          params ? statement.run ( params ) : statement.run ();

          return [];

        }

      };

    })();

  }

  query<R extends Dict<Out> = Dict<Out>, P extends Array<In> | Dict<In> = Array<In> | Dict<In>> ( sql: string, params?: P ): R[] {

    return this.prepare<R, P>( sql )( params );

  }

  serialize (): Uint8Array {

    return buffer2uint8 ( this.db.serialize () );

  }

  sql<R extends Dict<Out> = Dict<Out>, P extends Array<In> = Array<In>> ( statics: TemplateStringsArray, ...params: P ): R[] {

    const sql = statics.join ( '?' );

    return this.prepare<R, P>( sql )( params );

  }

  transaction ( fn: Callback ): void {

    this.db.transaction ( fn )();

  }

  vacuum (): void {

    this.execute ( 'VACUUM' );

  }

}

/* EXPORT */

export default Database;
export type {DatabaseOptions, FunctionOptions};
