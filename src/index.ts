
/* IMPORT */

import {DB} from 'node-deno-sqlite';
import whenExit from 'when-exit';
import {MEMORY_DATABASE, TEMPORARY_DATABASE, PAGE_SIZE, PAGES_COUNT} from './constants';
import {getDatabasePath, isUint8Array, ensureFileSync, ensureFileUnlinkSync} from './utils';
import type {PreparedQuery, Row, RowObject, QueryParameter, QueryParameterSet, SqlFunctionArgument, SqlFunctionResult} from 'node-deno-sqlite';
import type {Disposer, DatabaseOptions, FunctionOptions, Meta} from './types';

/* MAIN */

//TODO: ttl -> autocloser
//TODO: timeout -> abort query
//TODO: .dump
//TODO: .recover
//TODO: use workers automatically, maybe
//TODO: prepare statement, maybe it's more convenient at times

class Database {

  /* VARIABLES */

  public path: string;
  public memory: boolean;
  public readonly: boolean;
  public temporary: boolean;

  private db: DB;
  private statements: Record<string, PreparedQuery<any, any, any>> = {};

  /* CONSTRUCTOR */

  constructor ( path: Uint8Array | string, options: DatabaseOptions = {} ) {

    this.path = getDatabasePath ( path );
    this.memory = ( path === MEMORY_DATABASE );
    this.readonly = !!options.readonly;
    this.temporary = ( path === TEMPORARY_DATABASE || isUint8Array ( path ) );

    if ( !this.memory ) {
      ensureFileSync ( this.path );
    }

    this.db = new DB ( this.path, {
      mode: options.readonly ? 'read' : 'write',
      memory: this.memory
    });

    if ( options.page || options.size ) {
      const page = options.page || PAGE_SIZE;
      const size = options.size || ( page * PAGES_COUNT );
      const maxPageCount = Math.ceil ( size / page );
      this.db.execute ( `PRAGMA page_size=${page}` );
      this.db.execute ( `PRAGMA max_page_count=${maxPageCount}` );
    } else {
      this.db.execute ( `PRAGMA page_size=${PAGE_SIZE}` );
      this.db.execute ( `PRAGMA max_page_count=${PAGES_COUNT}` );
    }

    if ( options.wal ) {
      this.db.execute ( 'PRAGMA locking_mode=EXCLUSIVE' );
      this.db.execute ( 'PRAGMA synchronous=NORMAL' );
      this.db.execute ( 'PRAGMA journal_mode=WAL' );
    }

    if ( isUint8Array ( path ) ) {
      this.deserialize ( path );
    }

    whenExit ( () => this.close () ); //TODO: Dispose of this handler also though

  }

  /* API */

  close (): void {

    this.db.close ( true );

    if ( this.temporary ) {

      ensureFileUnlinkSync ( this.path );

    }

  }

  deserialize ( data: Uint8Array, mode: 'read' | 'write' = 'write' ): this {

    this.db.deserialize ( data, { mode } );

    return this;

  }

  execute ( sql: string ): void {

    this.db.execute ( sql );

  }

  function <A extends SqlFunctionArgument[] = SqlFunctionArgument[], R extends SqlFunctionResult = SqlFunctionResult> ( name: string, fn: ( ...args: A ) => R, options: FunctionOptions = {} ): Disposer {

    this.db.createFunction ( fn, { ...options, name } );

    return () => this.db.deleteFunction ( name );

  }

  meta (): Meta {

    return {
      autoCommit: this.db.autoCommit,
      changes: this.db.changes,
      lastInsertRowId: this.db.lastInsertRowId,
      totalChanges: this.db.totalChanges
    };

  }

  query<T extends RowObject = RowObject> ( sql: string, params?: QueryParameterSet ): T[] {

    const statement = ( this.statements[sql] ||= this.db.prepareQuery<Row, T>( sql ) );

    return statement.allEntries ( params );

  }

  serialize (): Uint8Array {

    return this.db.serialize ();

  }

  size (): number {

    const result = this.query<{ size: number }> ( 'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()' );

    return result[0].size;

  }

  sql<T extends RowObject = RowObject> ( statics: TemplateStringsArray, ...dynamics: QueryParameter[] ): T[] {

    return this.query<T> ( statics.join ( '?' ), dynamics );

  }

  transaction ( fn: () => void ): void {

    this.db.transaction ( fn );

  }

  vacuum (): void {

    this.db.execute ( 'VACUUM' );

  }

}

/* EXPORT */

export default Database;
export type {DatabaseOptions, FunctionOptions};
