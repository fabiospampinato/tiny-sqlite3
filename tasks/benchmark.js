
/* IMPORT */

import Database from '../dist/index.js';

/* MAIN */

const northwind = new Database ( './tasks/northwind.sqlite' );
const test = new Database ( '', { wal: true } );

console.time ( 'northwind' );
northwind.query ( 'SELECT * FROM "Order"' );
northwind.query ( 'SELECT * FROM "Product"' );
northwind.query ( 'SELECT * FROM "OrderDetail" LIMIT 10000' );
console.timeEnd ( 'northwind' );

console.time ( 'general' );
test.execute ( 'CREATE TABLE lorem (info TEXT)' );
test.transaction ( () => {
  for ( let i = 0; i < 1000; i++ ) {
    test.execute ( `INSERT INTO lorem VALUES ('Ipsum${i}')` );
  }
});
test.query ( 'SELECT COUNT(info) AS rows FROM lorem' );
test.query ( 'SELECT * FROM lorem WHERE info IN (?, ?)', ['Ipsum 2', 'Ipsum 3'] );
test.query ( 'SELECT * FROM lorem' );
test.execute ( 'DROP TABLE lorem' );
console.timeEnd ( 'general' );

northwind.close ();
test.close ();
