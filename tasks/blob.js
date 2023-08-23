
/* IMPORT */

import Database from '../dist/index.js';

/* MAIN */

const db = new Database ( '', { wal: true } );

db.query ( 'CREATE TABLE IF NOT EXISTS example ( id INTEGER PRIMARY KEY, data BLOB )' );

const sizes = [1_000, 10_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 25_000_000];
const blobs = sizes.map ( size => new TextEncoder ().encode ( 'a'.repeat ( size ) ) );

console.time ( 'roundtrips' );

for ( let i = 0, l = sizes.length; i < l; i++ ) {

  const size = sizes[i];
  const blob = blobs[i];

  console.log ( `\n[${size}]` );
  console.time ( 'roundtrip' );

  console.time ( 'write' );
  db.query ( 'INSERT INTO example VALUES( ?, ? )', [1, blob] );
  console.timeEnd ( 'write' );

  console.time ( 'read' );
  db.query ( 'SELECT data FROM example WHERE id=?', [1] );
  db.query ( 'SELECT data FROM example WHERE id=?', [1] );
  db.query ( 'SELECT data FROM example WHERE id=?', [1] );
  db.query ( 'SELECT data FROM example WHERE id=?', [1] );
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

console.log ( '\n[total]' );
console.timeEnd ( 'roundtrips' );

db.close ();
