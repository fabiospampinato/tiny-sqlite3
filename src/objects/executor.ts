
/* IMPORT */

import fs from 'node:fs';
import {UNRESOLVABLE} from '~/constants';
import Error from '~/objects/error';
import Spawner from '~/objects/spawner';
import {getTempPath, makeNakedPromise} from '~/utils';
import type {Options} from '~/types';

/* MAIN */

class Executor {

  /* VARIABLES */

  private lock: Promise<void>;
  private outputPath: string;
  private stderr: NodeJS.ReadableStream;
  private stdin: NodeJS.WritableStream;
  private stdout: NodeJS.ReadableStream;;

  /* CONSTRUCTOR */

  constructor ( bin: string, args: string[], options: Options, onClose: () => void ) {

    const process = Spawner.spawn ( bin, args );
    const {stderr, stdin, stdout} = process;

    stdin.setDefaultEncoding ( 'utf8' );
    stderr.setEncoding ( 'utf8' );
    stdout.setEncoding ( 'utf8' );

    this.lock = Promise.resolve ();
    this.outputPath = getTempPath ();
    this.stderr = stderr;
    this.stdin = stdin;
    this.stdout = stdout;

    process.on ( 'close', onClose );

    this.exec ( '.mode json' );

    if ( options.wal ) {

      this.exec ( 'PRAGMA journal_mode=WAL' );

    }

  }

  /* API */

  close (): void {

    this.exec ( '.quit' );

    this.lock = UNRESOLVABLE;

  }

  exec <T = unknown> ( query: string ): Promise<T> {

    const {promise, resolve, reject} = makeNakedPromise<T> ();

    this.lock = this.lock.then ( () => {

      return new Promise ( done => {

        const onData = async (): Promise<void> => {

          this.stdout.off ( 'data', onData );
          this.stderr.off ( 'data', onError );

          const output = await fs.promises.readFile ( this.outputPath, 'utf8' );

          const result = output ? JSON.parse ( output ) : [];

          resolve ( result );

          done ();

        };

        const onError = ( data: string ): void => {

          this.stdout.off ( 'data', onData );
          this.stderr.off ( 'data', onError );

          const error = new Error ( data );

          reject ( error );

          done ();

        };

        this.stdout.on ( 'data', onData );
        this.stderr.on ( 'data', onError );

        this.stdin.write ( `.output '${this.outputPath}'\n` );
        this.stdin.write ( `${query}\n;\n` );
        this.stdin.write ( `.output\n` );
        this.stdin.write ( `SELECT 1;\n` );

      });

    });

    return promise;

  }

}

/* EXPORT */

export default Executor;
