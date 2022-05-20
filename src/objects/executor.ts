
/* IMPORT */

import makePromiseNaked from 'promise-make-naked';
import {UNRESOLVABLE} from '~/constants';
import Error from '~/objects/error';
import Spawner from '~/objects/spawner';
import {getTempPath, readFileString} from '~/utils';
import type {Callback, Options, Process} from '~/types';

/* MAIN */

class Executor {

  /* VARIABLES */

  private lock: Promise<void>;
  private outputPath: string; //TODO: replace this with an in-memory stream, somehow
  private process: Process;

  /* CONSTRUCTOR */

  constructor ( bin: string, args: string[], options: Options, onClose: Callback ) {

    this.lock = Promise.resolve ();
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

    this.exec ( '.quit', true );

    this.lock = UNRESOLVABLE;

  }

  exec <T = unknown> ( query: string, noOutput: true ): Promise<[]>;
  exec <T = unknown> ( query: string, noOutput?: false ): Promise<T>;
  exec <T = unknown> ( query: string, noOutput: boolean = false ): Promise<T | []> {

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

            const output = await readFileString ( this.outputPath );

            const result = output ? JSON.parse ( output ) : [];

            resolve ( result );

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
