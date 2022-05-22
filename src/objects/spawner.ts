
/* IMPORT */

import {spawn} from 'node:child_process';
import {ensureFileSync} from '~/utils';
import type {Process} from '~/types';

/* MAIN */

const Spawner = {

  /* API */

  spawn: ( bin: string, args: string[] ): Process => {

    ensureFileSync ( args[0] );

    return spawn ( bin, args ); //TODO: Spawn more reliably, somehow

  }

};

/* EXPORT */

export default Spawner;
