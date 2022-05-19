
/* IMPORT */

import {createRequire} from 'node:module';
import Database from '../dist/index.js';

/* MAIN */

const benchBetter = async () => {

  const sqlite3 = createRequire ( import.meta.url )( 'better-sqlite3' );
  const northwidth = sqlite3 ( './tasks/northwind.sqlite' );
  const test = sqlite3 ( ':memory:' );

  console.time ( 'better-sqlite3' );

  northwidth.prepare ( `SELECT * FROM "Order"` ).all ();
  northwidth.prepare ( `SELECT * FROM "Product"` ).all ();
  northwidth.prepare ( `SELECT * FROM "OrderDetail" LIMIT 10000` ).all ();

  test.prepare ( `CREATE TABLE lorem (info TEXT)` ).run ();
  test.transaction ( () => {
    for ( let i = 0; i < 1000; i++ ) {
      test.prepare ( `INSERT INTO lorem VALUES ('${'Ipsum ' + i}')` ).run ();
    }
  });

  test.prepare ( `SELECT COUNT(info) AS rows FROM lorem` ).get ();
  test.prepare ( `SELECT * FROM lorem WHERE info IN ('${'Ipsum 2'}','${'Ipsum 3'}')` ).all ();
  test.prepare ( `SELECT * FROM lorem` ).all ();
  test.prepare ( `DROP TABLE lorem` ).run ();

  console.timeEnd ( 'better-sqlite3' );

  northwidth.close ();
  test.close ();

};

const benchTag = async () => {

  const tag = createRequire ( import.meta.url )( 'sqlite-tag-spawned' );
  const northwidth = tag ( './tasks/northwind.sqlite', { persistent: true } );
  const test = tag ( ':memory:', { persistent: true } );

  console.time ( 'sqlite-tag-spawned' );

  await northwidth.all`SELECT * FROM "Order"`;
  await northwidth.all`SELECT * FROM "Product"`;
  await northwidth.all`SELECT * FROM "OrderDetail" LIMIT 10000`;

  await test.query`CREATE TABLE lorem (info TEXT)`;
  const transaction = test.transaction ();
  for ( let i = 0; i < 1000; i++ ) {
    transaction`INSERT INTO lorem VALUES (${'Ipsum ' + i})`;
  }
  await transaction.commit ();

  await test.get`SELECT COUNT(info) AS rows FROM lorem`;
  await test.all`SELECT * FROM lorem WHERE info IN (${'Ipsum 2'},${'Ipsum 3'})`;
  await test.all`SELECT * FROM lorem`;
  await test.query`DROP TABLE ${test.raw`lorem`}`;

  console.timeEnd ( 'sqlite-tag-spawned' );

  northwidth.close ();
  test.close ();

};

const benchTiny = async () => {

  const northwidth = new Database ( './tasks/northwind.sqlite' );
  const test = new Database ( ':memory:' );

  console.time ( 'tiny-sqlite3' );

  await northwidth.sql`SELECT * FROM "Order"`;
  await northwidth.sql`SELECT * FROM "Product"`;
  await northwidth.sql`SELECT * FROM "OrderDetail" LIMIT 10000`;

  await test.sql`CREATE TABLE lorem (info TEXT)`;
  await test.transaction ( async () => {
    await test.batch ( () => {
      for ( let i = 0; i < 1000; i++ ) {
        test.sql`INSERT INTO lorem VALUES (${'Ipsum ' + i})`;
      }
    });
  });

  await test.sql`SELECT COUNT(info) AS rows FROM lorem`;
  await test.sql`SELECT * FROM lorem WHERE info IN (${'Ipsum 2'},${'Ipsum 3'})`;
  await test.sql`SELECT * FROM lorem`;
  await test.sql`DROP TABLE ${test.raw`lorem`}`;

  console.timeEnd ( 'tiny-sqlite3' );

  northwidth.close ();
  test.close ();

};

await benchBetter ();
await benchTag ();
await benchTiny ();
