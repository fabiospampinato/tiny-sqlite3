
/* IMPORT */

import {describe} from 'fava';
import fs from 'node:fs';
import os from 'node:os';
import process from 'node:process';
import {setTimeout as delay} from 'node:timers/promises';
import Database from '../dist/index.js';

/* MAIN */

//TODO: Check that json1 functions are available ()
//TODO: Add more tests for the new stuff, and review everything again

describe ( 'tiny-sqlite3', () => {

  describe ( 'constructor', it => {

    it ( 'can create an in-disk database', t => {

      const db = new Database ( 'test.db' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      const rows = db.query ( `SELECT * FROM example LIMIT 1` );

      t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

      t.true ( fs.existsSync ( 'test.db' ) );
      t.true ( fs.existsSync ( db.path ) );

      t.false ( db.memory );
      t.false ( db.readonly );
      t.false ( db.temporary );

      db.close ();

      t.true ( fs.existsSync ( 'test.db' ) );
      t.true ( fs.existsSync ( db.path ) );

      fs.rmSync ( 'test.db' );

    });

    it ( 'can create an in-memory database', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      const rows = db.query ( `SELECT * FROM example LIMIT 1` );

      t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

      t.is ( db.path, ':memory:' );

      t.true ( db.memory );
      t.false ( db.readonly );
      t.false ( db.temporary );

      db.close ();

    });

    it ( 'can create an in-temporary database', t => {

      const db = new Database ( '' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      const rows = db.query ( `SELECT * FROM example LIMIT 1` );

      t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

      t.true ( fs.existsSync ( db.path ) );
      t.true ( db.path.startsWith ( os.tmpdir () ) );

      t.false ( db.memory );
      t.false ( db.readonly );
      t.true ( db.temporary );

      db.close ();

      t.false ( fs.existsSync ( db.path ) );

    });

    it.skip ( 'can create multiple in-disk databases that share the same underlying files as another', t => {

      //TODO: Locking seems entirely broken here... it's requesting locks that it's never releasing

      const db1 = new Database ( '' );
      const db2 = new Database ( db1.path );

      db1.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db1.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      const rows1 = db1.query ( `SELECT * FROM example LIMIT 1` );
      const rows2 = db2.query ( `SELECT * FROM example LIMIT 1` );

      t.is ( db1.path, db2.path );

      t.deepEqual ( rows1, [{ id: 1, title: 'title1', description: 'description1' }] );
      t.deepEqual ( rows2, [{ id: 1, title: 'title1', description: 'description1' }] );

      db1.close ();
      db2.close ();

    });

    it ( 'can create multiple different in-memory databases', t => {

      const db1 = new Database ( ':memory:' );
      const db2 = new Database ( ':memory:' );

      db1.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db1.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      db2.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db2.query ( `INSERT INTO example VALUES( 2, 'title2', 'description2' )` );

      const rows1 = db1.query ( `SELECT * FROM example LIMIT 1` );
      const rows2 = db2.query ( `SELECT * FROM example LIMIT 1` );

      t.deepEqual ( rows1, [{ id: 1, title: 'title1', description: 'description1' }] );
      t.deepEqual ( rows2, [{ id: 2, title: 'title2', description: 'description2' }] );

      db1.close ();
      db2.close ();

    });

    it ( 'can create an in-temporary database from a serialized one', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      const serialized = db.serialize ();
      const deserialized1 = new Database ( serialized );
      const deserialized2 = new Database ( '' ).deserialize ( serialized );

      const rows1 = deserialized1.query ( `SELECT * FROM example LIMIT 1` );
      const rows2 = deserialized2.query ( `SELECT * FROM example LIMIT 1` );

      t.deepEqual ( rows1, [{ id: 1, title: 'title1', description: 'description1' }] );
      t.deepEqual ( rows2, [{ id: 1, title: 'title1', description: 'description1' }] );

      t.false ( deserialized1.memory );
      t.false ( deserialized1.readonly );
      t.true ( deserialized1.temporary );

      deserialized1.close ();
      deserialized2.close ();

    });

    it.skip ( 'can create a readonly database', t => {

      const db = new Database ( '' );
      const rodb = new Database ( db.path, { readonly: true } );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      const rows = rodb.query ( `SELECT * FROM example LIMIT 1` );

      t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

      t.false ( db.readonly );
      t.true ( rodb.readonly );

      t.throws ( () => {
        return rodb.query ( `INSERT INTO example VALUES( 2, 'title2', 'description2' )` );
      }, { message: 'Runtime error near line 7: attempt to write a readonly database (8)\n' } );

      db.close ();
      rodb.close ();

    });

    it.skip ( 'can use the "wal" journal mode', t => {

      const db = new Database ( '', { wal: true } );

      const rows = db.query ( `PRAGMA journal_mode` );

      t.deepEqual ( rows, [{ journal_mode: 'wal' }] );

      db.close ();

    });

    it ( 'defaults to the "delete" journal mode', t => {

      const db = new Database ( '' );

      const rows = db.query ( `PRAGMA journal_mode` );

      t.deepEqual ( rows, [{ journal_mode: 'delete' }] );

      db.close ();

    });

  });

  describe ( 'close', it => {

    it ( 'can be closed multiple times without throwing', t => {

      const db = new Database ( ':memory:' );

      db.close ();
      db.close ();
      db.close ();

      t.pass ();

    });

    it ( 'unlinks the in-temporary database after close', t => {

      const db = new Database ( '' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      t.true ( fs.existsSync ( db.path ) );

      db.close ();

      t.false ( fs.existsSync ( db.path ) );

    });

  });

  describe ( 'execute', it => {

    it ( 'can execute queries ignoring the result', t => {

      const db = new Database ( ':memory:' );

      db.execute (`
        CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT );
        INSERT INTO example VALUES( 1, 'title1', 'description1' );
        INSERT INTO example VALUES( 2, 'title2', 'description2' );
      `);

      const rowsExecute = db.execute ( `SELECT * FROM example` );
      const rowsQuery = db.query ( `SELECT * FROM example` );

      t.is ( rowsExecute, undefined );
      t.deepEqual ( rowsQuery, [{ id: 1, title: 'title1', description: 'description1' }, { id: 2, title: 'title2', description: 'description2' }] );

      db.close ();

    });

  });

  describe ( 'function', it => {

    it ( 'can register and unregister a function', t => {

      const db = new Database ( ':memory:' );

      t.throws ( () => {
        db.query ( `SELECT sum(1, 2) as a, sum(1,2,3,4) as b` );
      });

      const sum = ( ...numbers ) => numbers.reduce ( ( sum, number ) => sum + number, 0 );
      const dispose = db.function ( 'sum', sum );
      const summed = db.query ( `SELECT sum(1, 2) as a, sum(1,2,3,4) as b` );

      t.deepEqual ( summed, [{ a: 3, b: 10 }] );

      dispose ();

      t.throws ( () => {
        db.query ( `SELECT sum(1, 2) as a, sum(1,2,3,4) as b` );
      });

      db.close ();

    });

  });

  describe ( 'meta', it => {

    it ( 'can return some metadata about the database', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
      db.query ( `INSERT INTO example VALUES( 2, 'title2', 'description2' )` );
      db.query ( `INSERT INTO example VALUES( 3, 'title3', 'description3' )` );

      const meta = db.meta ();

      t.is ( meta.autoCommit, true );
      t.is ( meta.changes, 1 );
      t.is ( meta.lastInsertRowId, 3 );
      t.is ( meta.totalChanges, 3 );

      db.close ();

    });

  });

  describe ( 'query', it => {

    it ( 'can interpolate an array of values', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( ?, ?, ? )`, [1, 'title1', 'description1'] );

      const rows = db.query ( `SELECT * FROM example LIMIT 1` );

      t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

      db.close ();

    });

    it ( 'can interpolate an object of values', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( :id, :title, :description )`, { id: 1, title: 'title1', description: 'description1' } );

      const rows = db.query ( `SELECT * FROM example LIMIT 1` );

      t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

      db.close ();

    });

  });

  describe ( 'size', it => {

    it ( 'can set the size of a page', t => {

      const db1 = new Database ( ':memory:' );

      const count1 = db1.query ( `PRAGMA page_size` );

      t.deepEqual ( count1, [{ page_size: 4096 }] );

      const db2 = new Database ( ':memory:', { page: 8192 } );

      const count2 = db2.query ( `PRAGMA page_size` );

      t.deepEqual ( count2, [{ page_size: 8192 }] );

      db1.close ();
      db2.close ();

    });

    it ( 'can set the max size of a database', t => {

      const db1 = new Database ( ':memory:' );

      const count1 = db1.query ( `PRAGMA max_page_count` );

      t.deepEqual ( count1, [{ max_page_count: 1073741823 }] );

      const db2 = new Database ( ':memory:', { size: 4096000 } );

      const count2 = db2.query ( `PRAGMA max_page_count` );

      t.deepEqual ( count2, [{ max_page_count: 1000 }] );

      db1.close ();
      db2.close ();

    });

    it ( 'can retrieve the size of the database', t => {

      const db = new Database ( ':memory:' );

      const size1 = db.size ();

      t.is ( size1, 0 );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      const size2 = db.size ();

      t.is ( size2, 8192 );

      db.close ();

    });

  });

  describe ( 'sql', it => {

    it ( 'can interpolate a bigint', t => {

      const db = new Database ( ':memory:' );

      const rowsSmall = db.sql`SELECT ${123n} AS value`;

      t.deepEqual ( rowsSmall, [{ value: 123 }] );

      const rowsBig = db.sql`SELECT ${BigInt ( Number.MAX_SAFE_INTEGER ) * 2n} AS value`;

      t.deepEqual ( rowsBig, [{ value: BigInt ( Number.MAX_SAFE_INTEGER ) * 2n }] );

      db.close ();

    });

    it ( 'can interpolate a boolean', t => {

      const db = new Database ( ':memory:' );

      const rowsTrue = db.sql`SELECT ${true} AS value`;

      t.deepEqual ( rowsTrue, [{ value: 1 }] );

      const rowsFalse = db.sql`SELECT ${false} AS value`;

      t.deepEqual ( rowsFalse, [{ value: 0 }] );

      db.close ();

    });

    it ( 'can interpolate a date', t => {

      const db = new Database ( ':memory:' );

      const date = new Date ();

      const rows = db.sql`SELECT ${date} AS value`;

      t.deepEqual ( rows, [{ value: date.toISOString () }] );

      db.close ();

    });

    it ( 'can interpolate a null', t => {

      const db = new Database ( ':memory:' );

      const rows = db.sql`SELECT ${null} AS value`;

      t.deepEqual ( rows, [{ value: null }] );

      db.close ();

    });

    it ( 'can interpolate a number', t => {

      const db = new Database ( ':memory:' );

      const rows = db.sql`SELECT ${123} AS value`;

      t.deepEqual ( rows, [{ value: 123 }] );

      db.close ();

    });

    it ( 'can interpolate a string', t => {

      const db = new Database ( ':memory:' );

      const rows = db.sql`SELECT ${'foo'} AS value`;

      t.deepEqual ( rows, [{ value: 'foo' }] );

      db.close ();

    });

    it ( 'can interpolate a string with automatic escaping', t => {

      const db = new Database ( ':memory:' );

      const rows = db.sql`SELECT ${"f''o'o"} AS value`;

      t.deepEqual ( rows, [{ value: "f''o'o" }] );

      db.close ();

    });

    it.skip ( 'can interpolate an ArrayBuffer', t => {

      const db = new Database ( ':memory:' );

      const data = new Uint8Array ([ 72, 101, 108, 108, 111, 44,  32,  87, 111, 114, 108, 100,  33 ]).buffer;

      const rows = db.sql`SELECT ${data} AS value`;

      t.deepEqual ( rows, [{ value: data }] );

      db.close ();

    });

    it ( 'can interpolate a Uint8Array', t => {

      const db = new Database ( ':memory:' );

      const data = new Uint8Array ([ 72, 101, 108, 108, 111, 44,  32,  87, 111, 114, 108, 100,  33 ]);

      const rows = db.sql`SELECT ${data} AS value`;

      t.deepEqual ( rows, [{ value: data }] );

      db.close ();

    });

    it ( 'can interpolate an undefined', t => {

      const db = new Database ( ':memory:' );

      const rows = db.sql`SELECT ${undefined} AS value`;

      t.deepEqual ( rows, [{ value: null }] );

      db.close ();

    });

    it ( 'can interpolate an Infinity', t => {

      const db = new Database ( ':memory:' );

      const rowsPositive = db.sql`SELECT ${Infinity} AS value`;

      t.deepEqual ( rowsPositive, [{ value: Infinity }] );

      const rowsNegative = db.sql`SELECT ${-Infinity} AS value`;

      t.deepEqual ( rowsNegative, [{ value: -Infinity }] );

      db.close ();

    });

    it ( 'can interpolate a NaN', t => {

      const db = new Database ( ':memory:' );

      const rows = db.sql`SELECT ${NaN} AS value`;

      t.deepEqual ( rows, [{ value: null }] );

      db.close ();

    });

    it ( 'throws when interpolating a plain object', t => {

      const db = new Database ( ':memory:' );

      t.throws ( () => {
        return db.sql`SELECT ${{}} as value`;
      }, { message: 'Can not bind object.' } );

      db.close ();

    });

    it ( 'throws when interpolating a symbol', t => {

      const db = new Database ( ':memory:' );

      t.throws ( () => {
        return db.sql`SELECT ${Symbol ()} as value`;
      }, { message: 'Can not bind symbol.' } );

      db.close ();

    });

    it ( 'throws when interpolating an array', t => {

      const db = new Database ( ':memory:' );

      t.throws ( () => {
        return db.sql`SELECT ${[]} as value`;
      }, { message: 'Can not bind object.' } );

      db.close ();

    });

  });

  describe ( 'transaction', it => {

    it ( 'supports empty transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.true ( db.meta ().autoCommit );

      db.transaction ( () => {
        t.false ( db.meta ().autoCommit );
      });

      t.true ( db.meta ().autoCommit );

      const rows = db.query ( `SELECT * FROM example` );

      t.deepEqual ( rows, [] );

      db.close ();

    });

    it ( 'supports successful transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.true ( db.meta ().autoCommit );

      db.transaction ( async () => {
        t.false ( db.meta ().autoCommit );
        db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
        db.query ( `INSERT INTO example VALUES( 2, 'title2', 'description2' )` );
        db.query ( `INSERT INTO example VALUES( 3, 'title3', 'description3' )` );
        t.false ( db.meta ().autoCommit );
      });

      t.true ( db.meta ().autoCommit );

      const rows = db.query ( `SELECT * FROM example` );

      const expected = [
        { id: 1, title: 'title1', description: 'description1' },
        { id: 2, title: 'title2', description: 'description2' },
        { id: 3, title: 'title3', description: 'description3' }
      ];

      t.deepEqual ( rows, expected );

      db.close ();

    });

    it.skip ( 'supports failing transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.true ( db.meta ().autoCommit );

      t.throws ( () => {
        db.transaction ( () => {
          t.false ( db.meta ().autoCommit );
          db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
          db.query ( `INSERT INTO example VALUES( 2, 'title2', 'description2' )` );
          db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
          t.false ( db.meta ().autoCommit );
        });
      });

      t.true ( db.meta ().autoCommit );

      const rows = db.query ( `SELECT * FROM example` );

      t.deepEqual ( rows, [] );

      db.close ();

    });

    it ( 'supports successful nested transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.true ( db.meta ().autoCommit );

      db.transaction ( () => {
        t.false ( db.meta ().autoCommit );
        db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
        db.transaction ( () => {
          t.false ( db.meta ().autoCommit );
          db.query ( `INSERT INTO example VALUES( 2, 'title2', 'description2' )` );
          t.false ( db.meta ().autoCommit );
        });
        db.query ( `INSERT INTO example VALUES( 3, 'title3', 'description3' )` );
        t.false ( db.meta ().autoCommit );
      });

      t.true ( db.meta ().autoCommit );

      const rows = db.query ( `SELECT * FROM example` );

      const expected = [
        { id: 1, title: 'title1', description: 'description1' },
        { id: 2, title: 'title2', description: 'description2' },
        { id: 3, title: 'title3', description: 'description3' }
      ];

      t.deepEqual ( rows, expected );

      db.close ();

    });

    it.skip ( 'supports failing nested transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.true ( db.meta ().autoCommit );

      t.throws ( () => {
        db.transaction ( () => {
          t.false ( db.meta ().autoCommit );
          db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
          db.transaction ( () => {
            t.false ( db.meta ().autoCommit );
            db.query ( `INSERT INTO example VALUES( 2, 'title2', 'description1' )` );
            t.false ( db.meta ().autoCommit );
          });
          db.query ( `INSERT INTO example VALUES( 3, 'title3', 'description3' )` );
          t.false ( db.meta ().autoCommit );
        });
      });

      t.true ( db.meta ().autoCommit );

      const rows = db.query ( `SELECT * FROM example` );

      t.deepEqual ( rows, [] );

      db.close ();

    });

  });

  describe ( 'vacuum', it => {

    it ( 'can shrink a database by vacuuming freed pages', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', '${'description1'.repeat ( 10_000 )}' )` );

      const size1 = db.size ();

      db.query ( `DELETE FROM example WHERE id=${1}` );

      const size2 = db.size ();

      db.vacuum ();

      const size3 = db.size ();

      db.vacuum ();

      const size4 = db.size ();

      t.is ( size1, size2 );
      t.true ( size3 < size2 );
      t.is ( size3, size4 );

      db.close ();

    });

  });

  describe ( 'todo', it => {

    it.skip ( 'can re-open the connection automatically after closing', t => {

      const db = new Database ( ':memory:' );

      const result1 = db.query ( `SELECT 1 AS value` );

      t.deepEqual ( result1, [{ value: 1 }] );

      db.close ();

      const result2 = db.query ( `SELECT 2 AS value` );

      t.deepEqual ( result2, [{ value: 2 }] );

      db.close ();

      t.pass ();

    });

    it.skip ( 'can re-open the connection automatically after killing', t => {

      const db = new Database ( ':memory:' );

      const result1 = db.query ( `SELECT 1 AS value` );

      t.deepEqual ( result1, [{ value: 1 }] );

      process.kill ( db.pid (), 'SIGKILL' );
      process.kill ( db.pid (), 'SIGKILL' );
      process.kill ( db.pid (), 'SIGKILL' );

      delay ( 100 );

      const result2 = db.query ( `SELECT 2 AS value` );

      t.deepEqual ( result2, [{ value: 2 }] );

      db.close ();

      t.pass ();

    });

    it.skip ( 'supports closing the process automatically after a ttl', t => {

      const db = new Database ( ':memory:', { ttl: 250 } );

      const pid1 = db.pid ();

      db.query ( `SELECT 1 AS value` );

      const pid2 = db.pid ();

      delay ( 200 );

      db.query ( `SELECT 1 AS value` );

      const pid3 = db.pid ();

      delay ( 200 );

      const pid4 = db.pid ();

      delay ( 200 );

      const pid5 = db.pid ();

      t.is ( pid1, undefined );
      t.true ( pid2 > 0 );
      t.is ( pid2, pid3 );
      t.is ( pid3, pid4 );
      t.is ( pid5, undefined );

      db.close ();

    });

    it.skip ( 'can dump the contents of a database', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      const sql = db.dump ();

      const expected = (
        `PRAGMA foreign_keys=OFF;\n` +
        `BEGIN TRANSACTION;\n` +
        `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT );\n` +
        `INSERT INTO example VALUES(1,'title1','description1');\n` +
        `COMMIT;\n`
      );

      t.is ( sql, expected );

      db.close ();

    });

    it.skip ( 'can recover the contents of a database', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      const sql = db.recover ();

      const expected = (
        `BEGIN;\n` +
        `PRAGMA writable_schema = on;\n` +
        `PRAGMA encoding = 'UTF-8';\n` +
        `PRAGMA page_size = '4096';\n` +
        `PRAGMA auto_vacuum = '0';\n` +
        `PRAGMA user_version = '0';\n` +
        `PRAGMA application_id = '0';\n` +
        `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT );\n` +
        `INSERT OR IGNORE INTO 'example'('id', 'title', 'description') VALUES (1, 'title1', 'description1');\n` +
        `PRAGMA writable_schema = off;\n` +
        `COMMIT;\n`
      );

      t.is ( sql, expected );

      db.close ();

    });

  });

});
