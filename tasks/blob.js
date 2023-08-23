
/* IMPORT */

import Database from '../dist/index.js';

/* MAIN */

console.time ( 'total' );

for ( const path of [':memory:', ''] ) {

  const db = new Database ( path );

  for ( const size of [1_000, 10_000, 100_000, 1_000_000, 10_000_000, 25_000_000] ) {

    const BLOB = new TextEncoder ().encode ( 'a'.repeat ( size ) );

    db.query ( 'CREATE TABLE IF NOT EXISTS example ( id INTEGER PRIMARY KEY, data BLOB )' );

    console.log ( `\n[${path}]: ${size}` );
    console.time ( 'roundtrip' );

    console.time ( 'write' );
    db.query ( 'INSERT INTO example VALUES( ?, ? )', [1, BLOB] );
    console.timeEnd ( 'write' );

    console.time ( 'read' );
    db.query ( 'SELECT data FROM example WHERE id=?', [1] );
    console.timeEnd ( 'read' );

    console.time ( 'delete' );
    db.query ( 'DELETE FROM example WHERE id=?', [1] );
    console.timeEnd ( 'delete' );

    console.time ( 'vacuum' );
    db.vacuum ();
    console.timeEnd ( 'vacuum' );

    console.timeEnd ( 'roundtrip' );

  }

  db.close ();

}

console.log ( '' );
console.timeEnd ( 'total' );
