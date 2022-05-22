
/* IMPORT */

import makePromiseNaked from 'promise-make-naked';
import zeptoid from 'zeptoid';
import {UNRESOLVABLE} from '~/constants';
import Error from '~/objects/error';
import Spawner from '~/objects/spawner';
import {castError, delay, getTempPath, readFileString} from '~/utils';
import type {Callback, Options, Process} from '~/types';

/* MAIN */

class Executor {

  /* VARIABLES */

  private id: string;
  private lock: Promise<void>;
  private open: boolean;
  private outputPath: string; //TODO: Maybe replace this with a *performant* in-memory stream, if possible
  private process: Process;

  /* CONSTRUCTOR */

  constructor ( bin: string, args: string[], options: Options, onClose: Callback ) {

    this.id = zeptoid ();
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

          try {

            const content = await readFileString ( this.outputPath );
            const termination = `[{"_":"${this.id}"}]\n`;

            if ( !content.endsWith ( termination ) ) { // Trying again, the result of the termination query isn't there, the output isn't all there yet //TODO: Just fail after a number of attempts

              await delay ( 50 );

              return onData ();

            }

            const output = content.slice ( 0, - termination.length );
            const result = noOutput ? [] : ( noParse ? output : ( output ? JSON.parse ( output ) : [] ) );

            resolve ( result );

          } catch ( error: unknown ) {

            reject ( castError ( error ) );

          }

          done ();

        };

        const onError = ( data: string ): void => {

          this.process.stderr.off ( 'data', onError );

          const error = new Error ( data );

          reject ( error );

        };

        this.process.stdout.on ( 'data', onData );
        this.process.stderr.on ( 'data', onError );

        this.process.stdin.write ( `.output '${this.outputPath}'\n` ); // Setting output to the output file, to bypass Node's slow-ass streams
        this.process.stdin.write ( `${query}\n;\n` ); // Executing the actual query
        this.process.stdin.write ( `SELECT '${this.id}' AS _;\n` ); // Executing the termination query, to make sure the actual query terminated
        this.process.stdin.write ( `.output\n` ); // Setting output to stdout, to get notified
        this.process.stdin.write ( `SELECT 1;\n` ); // Executing a dummy query, to get notified

      });

    });

    return promise;

  }

}

/* EXPORT */

export default Executor;
