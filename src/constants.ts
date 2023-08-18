
/* IMPORT */

import os from 'node:os';

/* MAIN */

const MEMORY_DATABASE = ':memory:';
const TEMPORARY_DATABASE = '';

const NULL_PATH = ( os.platform () === 'win32' ) ? 'NUL' : '/dev/null';

const PAGE_SIZE = 4096;
const PAGES_COUNT = 1_073_741_823;

const UNRESOLVABLE = new Promise<any> ( () => {} );

/* EXPORT */

export {MEMORY_DATABASE, TEMPORARY_DATABASE, NULL_PATH, PAGE_SIZE, PAGES_COUNT, UNRESOLVABLE};
