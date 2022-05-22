
/* IMPORT */

import makePromiseNaked from 'promise-make-naked';
import {UNRESOLVABLE} from '~/constants';
import Error from '~/objects/error';
import Spawner from '~/objects/spawner';
import {castError, getTempPath, readFileString} from '~/utils';
import type {Callback, Options, Process} from '~/types';

/* MAIN */

class Executor {

  /* VARIABLES */

  private lock: Promise<void>;
  private open: boolean;
  private outputPath: string; //TODO: replace this with an in-memory stream, somehow
  private process: Process;

  /* CONSTRUCTOR */

  constructor ( bin: string, args: string[], options: Options, onClose: Callback ) {

    this.lock = Promise.resolve ();
    this.open = true;
    this.outputPath = getTempPath ();
    this.process = Spawner.spawn ( bin, args );

    this.process.stdin.setDefaultEncoding ( 'utf8' );
    this.process.stderr.setEncoding ( 'utf8' );
    this.process.stdout.setEncoding ( 'utf8' );

    this.process.on ( 'close', onClose );

    this.exec ( '.mode json', true );

    if ( options.wal ) {

      this.exec ( 'PRAGMA journal_mode=WAL', true );

    }

  }

  /* API */

  close (): void {

    if ( !this.open ) return;

    this.exec ( '.quit', true );

    this.lock = UNRESOLVABLE;

    this.open = false;

  }

  exec <T = unknown> ( query: string, noOutput: true, noParse: true ): Promise<string>;
  exec <T = unknown> ( query: string, noOutput: true, noParse?: false ): Promise<[]>;
  exec <T = unknown> ( query: string, noOutput: false, noParse: true ): Promise<string>;
  exec <T = unknown> ( query: string, noOutput?: false, noParse?: false ): Promise<T>;
  exec <T = unknown> ( query: string, noOutput: boolean = false, noParse: boolean = false ): Promise<T | [] | string> {

    if ( !this.open ) throw new Error ( 'database connection closed' );

    const {promise, resolve, reject} = makePromiseNaked<T | []> ();

    this.lock = this.lock.then ( () => {

      return new Promise ( done => {

        const onClose = (): void => {

          this.process.stdout.off ( 'data', onData );
          this.process.stderr.off ( 'data', onError );

        };

        const onData = async (): Promise<void> => {

          onClose ();

          if ( noOutput ) { // Avoiding reading the output file

            resolve ( [] );

          } else { // Reading the output file

            try {

              const output = await readFileString ( this.outputPath );

              const result = noParse ? output : ( output ? JSON.parse ( output ) : [] );

              resolve ( result );

            } catch ( error: unknown ) {

              reject ( castError ( error ) );

            }

          }

          done ();

        };

        const onError = ( data: string ): void => {

          onClose ();

          const error = new Error ( data );

          reject ( error );

          done ();

        };

        this.process.stdout.on ( 'data', onData );
        this.process.stderr.on ( 'data', onError );

        this.process.stdin.write ( `.output '${this.outputPath}'\n` );
        this.process.stdin.write ( `${query}\n;\n` );
        this.process.stdin.write ( `.output\n` );
        this.process.stdin.write ( `SELECT 1;\n` );

      });

    });

    return promise;

  }

}

/* EXPORT */

export default Executor;
