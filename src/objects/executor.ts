
/* IMPORT */

import buffer2uint8 from 'buffer2uint8';
import {spawn} from 'node:child_process';
import makePromiseNaked from 'promise-make-naked';
import U8 from 'uint8-encoding';
import zeptoid from 'zeptoid';
import {castError, isNull} from '../utils/lang';
import Autocloser from './autocloser';
import Rope from './rope';
import type {Callback, Process} from '../types';

/* MAIN */

class Executor {

  /* VARIABLES */

  public process?: Process;

  private id: string;
  private idMarker: string;
  private idMarkerBuffer: Uint8Array;
  private bin: string;
  private args: string[];
  private lock: Promise<void>;
  private autocloser: Autocloser;
  private onClose: Callback;

  /* CONSTRUCTOR */

  constructor ( bin: string, args: string[], ttl: number = Infinity, onClose: Callback ) {

    this.id = zeptoid ();
    this.idMarker = `[{"_":"${this.id}"}]\n`;
    this.idMarkerBuffer = U8.encode ( this.idMarker );
    this.bin = bin;
    this.args = [...args, '-cmd', '.mode json'];
    this.lock = Promise.resolve ();
    this.autocloser = new Autocloser ( ttl, () => this.close () );
    this.onClose = onClose;

  }

  /* API */

  open (): Process {

    const process = this.process;

    if ( process && isNull ( process.exitCode ) ) return process; // Still running

    this.autocloser.start ();

    this.process = spawn ( this.bin, this.args );

    this.process.stdin.setDefaultEncoding ( 'utf8' );

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
    this.autocloser.stop ();

  }

  exec ( query: string, mode: 'null', target?: Process ): Promise<void>;
  exec ( query: string, mode: 'buffer', target?: Process ): Promise<Uint8Array>;
  exec ( query: string, mode: 'json', target?: Process ): Promise<string>;
  exec <T = unknown> ( query: string, mode?: 'parse', target?: Process ): Promise<T | []>;
  exec <T = unknown> ( query: string, mode: 'null' | 'buffer' | 'json' | 'parse', target?: Process ): Promise<T | [] | Uint8Array | string | void>;
  exec <T = unknown> ( query: string, mode: 'null' | 'buffer' | 'json' | 'parse' = 'parse', target?: Process ): Promise<T | [] | Uint8Array | string | void> {

    const {promise, resolve, reject, isPending} = makePromiseNaked<any> ();

    this.lock = this.lock.then ( () => {

      const process = target || this.open ();

      this.autocloser.pause ();

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

        const onStdout = ( data: Buffer ): void => {

          stdout.push ( data );

          if ( stdout.endsWith ( this.idMarkerBuffer ) ) { // Stdout ended

            stdoutEnded = true;

            onReturn ();

          }

        };

        const onStderr = ( data: Buffer ): void => {

          stderr.push ( data );

          if ( stderr.endsWith ( this.idMarkerBuffer ) ) { // Stderr ended

            stderrEnded = true;

            onReturn ();

          }

        };

        const onReturn = (): void => {

          if ( !isPending () ) return;

          if ( !stdoutEnded || !stderrEnded ) return;

          try {

            const error = stderr.toString ().slice ( 0, -this.idMarker.length );

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

            } else if ( mode === 'buffer' ) {

              const buffer = buffer2uint8 ( stdout.concat ().subarray ( 0, -this.idMarkerBuffer.length ) );

              resolve ( buffer );

            } else {

              const output = stdout.toString ().slice ( 0, -this.idMarker.length );

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

          this.autocloser.resume ();

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
