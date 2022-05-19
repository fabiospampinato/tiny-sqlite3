
/* IMPORT */

import {spawn} from 'node:child_process';
import {ensureFileSync} from '~/utils';
import type {Process} from '~/types';

/* MAIN */

//TODO: Make this even more reliable, really trying hard to write the file on disk, though consider multi-process scenarios too

const Spawner = {

  /* API */

  spawn: ( bin: string, args: string[] ): Process => {

    ensureFileSync ( args[0] );

    return spawn ( bin, args );

  }

};

/* EXPORT */

export default Spawner;
