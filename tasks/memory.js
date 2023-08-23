
/* IMPORT */

import Database from '../dist/index.js';

/* MAIN */

const dbs = [];
const limit = 10_000;

console.time ( 'create' );
for ( let i = 0; i < limit; i++ ) {
  dbs[i] = new Database ( ':memory:' );
  dbs[i].query ( 'SELECT 1' );
}
console.timeEnd ( 'create' );

console.log ( process.memoryUsage () );

console.time ( 'close' );
for ( let i = 0; i < limit; i++ ) {
  dbs[i].close ();
}
console.timeEnd ( 'close' );
