
/* IMPORT */

import {spawn} from 'node:child_process';
import type {ChildProcessWithoutNullStreams} from 'node:child_process';
import {ensureFileSync} from '~/utils';

/* MAIN */

//TODO: Make this even more reliable, really trying hard to write the file on disk, though consider multi-process scenarios too

class Spawner {

  /* STATIC API */

  static spawn ( bin: string, args: string[] ): ChildProcessWithoutNullStreams {

    ensureFileSync ( args[0] );

    return spawn ( bin, args );

  }

}

/* EXPORT */

export default Spawner;
