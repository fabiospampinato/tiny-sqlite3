
/* IMPORT */

import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {UNRESOLVABLE} from '~/constants';
import Error from '~/objects/error';
import {makeNakedPromise} from '~/utils';
import type {Options} from '~/types';

/* MAIN */

//TODO: Retry a bunch of times to open a database (SqliteError: SQLITE_ERROR: Error: unable to open database "/var/folders/lp/1v46h3cj5qv32n0s83c2624w0000gn/T/ac7b82d4-e2ec-450e-809e-7a4d8d01f1fa": unable to open database file)

class Executor {

  /* VARIABLES */

  private id: string;
  private idResult: string;
  private idSelect: string;
  private lock: Promise<void>;
  private stderr: NodeJS.ReadableStream;
  private stdin: NodeJS.WritableStream;
  private stdout: NodeJS.ReadableStream;;

  /* CONSTRUCTOR */

  constructor ( bin: string, args: string[], options: Options ) {

    const {stderr, stdin, stdout} = spawn ( bin, args );

    stdin.setDefaultEncoding ( 'utf8' );
    stderr.setEncoding ( 'utf8' );
    stdout.setEncoding ( 'utf8' );

    this.id = randomUUID ();
    this.idResult = `[{"_":"${this.id}"}]\n`;
    this.idSelect = `SELECT '${this.id}' AS _;\n`;
    this.lock = Promise.resolve ();
    this.stderr = stderr;
    this.stdin = stdin;
    this.stdout = stdout;

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

        let output: string = '';

        const onData = ( data: string ): void => {

          output += data;

          let isEnd = false;

          while ( output.endsWith ( this.idResult ) ) {

            isEnd = true;

            output = output.slice ( 0, - this.idResult.length );

          }

          if ( isEnd ) {

            this.stdout.off ( 'data', onData );
            this.stderr.off ( 'data', onError );

            while ( output.startsWith ( this.idResult ) ) {

              output = output.slice ( this.idResult.length );

            }

            const result = output ? JSON.parse ( output ) : [];

            resolve ( result );

            done ();

          }

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

        this.stdin.write ( `${query}\n;\n${this.idSelect}` );

      });

    });

    return promise;

  }

}

/* EXPORT */

export default Executor;
