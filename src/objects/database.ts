
/* IMPORT */

import fs from 'node:fs';
import whenExit from 'when-exit';
import {MEMORY_DATABASE} from '~/constants';
import Error from '~/objects/error';
import Executor from '~/objects/executor';
import Raw from '~/objects/raw';
import {builder, getDatabaseBin, getDatabasePath, getTempPath} from '~/utils';
import type {Options} from '~/types';

/* MAIN */

//TODO: Support WASM and make this interface isomorphic

class Database {

  /* VARIABLES */

  public name: string;
  public memory: boolean;
  public open: boolean;
  public readonly: boolean;
  public transacting: boolean;

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
    this.memory = ( db === MEMORY_DATABASE || db instanceof Uint8Array );
    this.open = true;
    this.readonly = !!options.readonly;
    this.transacting = false;

    this.executor = new Executor ( bin, args, options, this.close );

    whenExit ( this.close );

  }

  /* API */

  backup = async ( file: string ): Promise<void> => {

    await this.executor.exec ( `.backup '${file}'` );

  };

  close = (): void => {

    this.open = false;

    this.executor.close ();

    if ( this.memory ) {

      try {

        if ( fs.existsSync ( this.name ) ) {

          fs.unlinkSync ( this.name );

        }

      } catch ( error: unknown ) {

        console.log ( error );

      }

    }

  };

  raw = ( value: string ): Raw => {

    return new Raw ( value );

  };

  serialize = async (): Promise<Uint8Array> => {

    const temp = getTempPath ();

    await this.backup ( temp );

    const buffer = await fs.promises.readFile ( temp );
    const uint8 = new Uint8Array ( buffer, buffer.byteOffset, buffer.byteLength );

    fs.unlinkSync ( temp );

    return uint8;

  };

  sql = <T = any> ( strings: TemplateStringsArray, ...expressions: unknown[] ): Promise<T> => {

    const query = builder ( strings, expressions );

    return this.executor.exec<T> ( query );

  };

  transaction = async ( fn: () => void ): Promise<boolean> => {

    if ( this.transacting ) throw new Error ( 'nested transactions are not supported' );

    try {

      this.transacting = true;

      await this.executor.exec ( 'BEGIN TRANSACTION' );

      await fn ();

      await this.executor.exec ( 'COMMIT' );

      return true;

    } catch {

      await this.executor.exec ( 'ROLLBACK TRANSACTION' );

      return false;

    } finally {

      this.transacting = false;

    }

  };

}

/* EXPORT */

export default Database;
