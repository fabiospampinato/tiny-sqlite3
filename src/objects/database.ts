
/* IMPORT */

import whenExit from 'when-exit';
import {MEMORY_DATABASE, UNRESOLVABLE} from '~/constants';
import Error from '~/objects/error';
import Executor from '~/objects/executor';
import Raw from '~/objects/raw';
import {builder, ensureFileUnlink, ensureFileUnlinkSync, getDatabaseBin, getDatabasePath, getTempPath, isUint8Array, readFileBuffer} from '~/utils';
import type {Options, Stats} from '~/types';

/* MAIN */

//TODO: Support automatically closing and re-opening databases
//TODO: Support WASM and make this interface isomorphic
//TODO: Support bundling, somehow
//TODO: The ARM64 build for Windows is not actually for ARM64

class Database {

  /* VARIABLES */

  public name: string;
  public memory: boolean;
  public open: boolean;
  public readonly: boolean;
  public batching: boolean;
  public transacting: boolean;

  private batched: string[];
  private executor: Executor;

  /* CONSTRUCTOR */

  constructor ( db: Database | Uint8Array | string, options: Options = {} ) {

    const bin = getDatabaseBin ( options.bin );
    const path = getDatabasePath ( db );
    const args = [path];

    if ( options.readonly ) {

      args.push ( '-readonly' );

    }

    if ( options.timeout ) {

      args.push ( '-cmd', `.timeout ${options.timeout}` );

    }

    if ( options.args ) {

      args.push ( ...options.args );

    }

    this.name = path;
    this.memory = ( db === MEMORY_DATABASE || isUint8Array ( db ) );
    this.open = true;
    this.readonly = !!options.readonly;
    this.batching = false;
    this.transacting = false;

    this.batched = [];
    this.executor = new Executor ( bin, args, options, this.close );

    whenExit ( this.close );

  }

  /* API */

  backup = async ( filePath: string ): Promise<void> => {

    await this.executor.exec ( `.backup '${filePath}'`, true );

  };

  batch = async ( fn: () => void ): Promise<void> => {

    if ( this.batching ) throw new Error ( 'nested batches are not supported' );

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

    this.open = false;

    this.executor.close ();

    if ( this.memory ) {

      ensureFileUnlinkSync ( this.name );

    }

  };

  raw = ( value: string ): Raw => {

    return new Raw ( value );

  };

  serialize = async (): Promise<Uint8Array> => {

    const temp = getTempPath ();

    await this.backup ( temp );

    const uint8 = await readFileBuffer ( temp );

    await ensureFileUnlink ( temp );

    return uint8;

  };

  sql = <T = any> ( strings: TemplateStringsArray, ...expressions: unknown[] ): Promise<T> => {

    const query = builder ( strings, expressions );

    if ( this.batching ) {

      this.batched.push ( query );

      return UNRESOLVABLE;

    } else {

      return this.executor.exec<T> ( query );

    }

  };

  stats = async (): Promise<Stats> => {

    const statsRaw = await this.executor.exec<string> ( '.stats', false, true );
    const stats = Object.fromEntries ( statsRaw.split ( /\r?\n/ ).filter ( line => line ).map ( line => line.split ( ':' ).map ( key => key.trim () ) ) );

    return stats;

  };

  transaction = async ( fn: () => void ): Promise<boolean> => {

    if ( this.transacting ) throw new Error ( 'nested transactions are not supported' );

    try {

      this.transacting = true;

      await this.executor.exec ( 'BEGIN TRANSACTION', true );

      await fn ();

      await this.executor.exec ( 'COMMIT', true );

      return true;

    } catch {

      await this.executor.exec ( 'ROLLBACK TRANSACTION', true );

      return false;

    } finally {

      this.transacting = false;

    }

  };

}

/* EXPORT */

export default Database;
