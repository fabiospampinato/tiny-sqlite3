
/* IMPORT */

import {spawn} from 'node:child_process';
import makePromiseNaked from 'promise-make-naked';
import zeptoid from 'zeptoid';
import {castError, isNull} from '../utils/lang';
import Rope from './rope';
import type {Callback, Process} from '../types';

/* MAIN */

class Executor {

  /* VARIABLES */

  public process?: Process;

  private id: string;
  private idMarker: string;
  private bin: string;
  private args: string[];
  private lock: Promise<void>;
  private onClose: Callback;

  /* CONSTRUCTOR */

  constructor ( bin: string, args: string[], onClose: Callback ) {

    this.id = zeptoid ();
    this.idMarker = `[{"_":"${this.id}"}]\n`;
    this.bin = bin;
    this.args = [...args, '-cmd', '.mode json'];
    this.lock = Promise.resolve ();
    this.onClose = onClose;

  }

  /* API */

  open (): Process {

    const process = this.process;

    if ( process && isNull ( process.exitCode ) ) return process; // Still running

    this.process = spawn ( this.bin, this.args );

    this.process.stdin.setDefaultEncoding ( 'utf8' );
    this.process.stderr.setEncoding ( 'utf8' );
    this.process.stdout.setEncoding ( 'utf8' );

    this.process.on ( 'exit', this.onClose );

    return this.process;

  }

  close (): void {

    const process = this.process;

    if ( !process ) return; // Already closed, or never started

    if ( isNull ( process.exitCode ) ) { // Still running, closing it

      // Quitting with patience

      this.exec ( '.quit', 'null', process ).catch ( () => {

        // Quitting without patience

        process.kill (  'SIGKILL' );
        process.kill (  'SIGKILL' );
        process.kill (  'SIGKILL' );

      });

    }

    this.lock = Promise.resolve ();
    this.process = undefined;

  }

  exec ( query: string, mode: 'null', target?: Process ): Promise<void>;
  exec ( query: string, mode: 'json', target?: Process ): Promise<string>;
  exec <T = unknown> ( query: string, mode?: 'parse', target?: Process ): Promise<T | []>;
  exec <T = unknown> ( query: string, mode: 'null' | 'json' | 'parse', target?: Process ): Promise<T | [] | string | void>;
  exec <T = unknown> ( query: string, mode: 'null' | 'json' | 'parse' = 'parse', target?: Process ): Promise<T | [] | string> {

    const {promise, resolve, reject, isPending} = makePromiseNaked<any> ();

    this.lock = this.lock.then ( () => {

      const process = target || this.open ();

      return new Promise ( done => {

        let stdout = new Rope ();
        let stderr = new Rope ();

        let stdoutEnded = false;
        let stderrEnded = false;

        const onQuery = (): void => {

          try {

            process.stdin.write ( `${query}\n;\n` ); // Executing the actual query
            process.stdin.write ( `SELECT '${this.id}' AS _;\n` ); // Executing the stdout termination query, to make sure we know when the stdout stream ends
            process.stdin.write ( `.output stderr\nSELECT '${this.id}' AS _;\n.output\n` ); // Executing the stderr termination query, to make sure we know when the stderr stream ends

          } catch ( error: unknown ) {

            onReject ( error );

            onDone ();

          }

        };

        const onListen = (): void => {

          process.on ( 'exit', onClose );
          process.stdout.on ( 'data', onStdout );
          process.stderr.on ( 'data', onStderr );

        };

        const onUnlisten = (): void => {

          process.off ( 'exit', onClose );
          process.stdout.off ( 'data', onStdout );
          process.stderr.off ( 'data', onStderr );

        };

        const onClose = (): void => {

          if ( !isPending () ) return;

          if ( query === '.quit' ) { // We closed it, all good

            onResolve ();

          } else { // It closed unexpectedly

            onReject ( 'Process exited unexpectedly' );

          }

          onDone ();

        };

        const onStdout = ( data: string ): void => {

          stdout.push ( data );

          if ( stdout.endsWith ( this.idMarker ) ) { // Stdout ended

            stdoutEnded = true;

            onReturn ();

          }

        };

        const onStderr = ( data: string ): void => {

          stderr.push ( data );

          if ( stderr.endsWith ( this.idMarker ) ) { // Stderr ended

            stderrEnded = true;

            onReturn ();

          }

        };

        const onReturn = (): void => {

          if ( !isPending () ) return;

          if ( !stdoutEnded || !stderrEnded ) return;

          try {

            const error = stderr.slice ( 0, -this.idMarker.length );

            if ( error.length ) {

              onReject ( error );

            } else {

              onResolve ();

            }

          } catch ( error: unknown ) {

            onReject ( error );

          } finally {

            onDone ();

          }

        };

        const onResolve = (): void => {

          if ( !isPending () ) return;

          try {

            if ( mode === 'null' ) {

              resolve ( undefined );

            } else {

              const output = stdout.slice ( 0, -this.idMarker.length );

              if ( mode === 'json' ) {

                resolve ( output );

              } else if ( output.length ) {

                resolve ( JSON.parse ( output ) );

              } else {

                resolve ( [] );

              }

            }

          } catch ( error: unknown ) {

            onReject ( error );

          }

        };

        const onReject = ( error: unknown ): void => {

          if ( !isPending () ) return;

          reject ( castError ( error ) );

        };

        const onDone = (): void => {

          onUnlisten ();

          done ();

        };

        onListen ();
        onQuery ();

      });

    });

    return promise;

  }

}

/* EXPORT */

export default Executor;
