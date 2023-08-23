
/* IMPORT */

import {describe} from 'fava';
import {Buffer} from 'node:buffer';
import fs from 'node:fs';
import os from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import Database from '../dist/index.js';

/* MAIN */

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

    it ( 'can create multiple in-disk databases that share the same underlying files as another', t => {

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
      const deserialized = new Database ( serialized );

      const rows1 = db.query ( `SELECT * FROM example LIMIT 1` );
      const rows2 = deserialized.query ( `SELECT * FROM example LIMIT 1` );

      t.deepEqual ( rows1, [{ id: 1, title: 'title1', description: 'description1' }] );
      t.deepEqual ( rows2, [{ id: 1, title: 'title1', description: 'description1' }] );

      t.false ( deserialized.memory );
      t.false ( deserialized.readonly );
      t.true ( deserialized.temporary );

      db.close ();
      deserialized.close ();

    });

    it ( 'can create a readonly database', t => {

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
      }, { message: 'attempt to write a readonly database' } );

      db.close ();
      rodb.close ();

    });

    it ( 'can use the "wal" journal mode', t => {

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

    it ( 'can set the size of a page', t => {

      const db1 = new Database ( ':memory:' );

      const count1 = db1.query ( `PRAGMA page_size` );

      t.deepEqual ( count1, [{ page_size: 16384 }] );

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

      const db2 = new Database ( ':memory:', { size: 16384000 } );

      const count2 = db2.query ( `PRAGMA max_page_count` );

      t.deepEqual ( count2, [{ max_page_count: 1000 }] );

      db1.close ();
      db2.close ();

    });

  });

  describe ( 'getters', it => {

    it ( 'can retrieve some metadata about the database', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
      db.query ( `INSERT INTO example VALUES( 2, 'title2', 'description2' )` );
      db.query ( `INSERT INTO example VALUES( 3, 'title3', 'description3' )` );

      t.is ( db.changes, 1 );
      t.is ( db.lastInsertRowId, 3 );
      t.is ( db.totalChanges, 3 );
      t.is ( db.transacting, false );

      db.close ();

    });

    it ( 'can retrieve the size of the database', t => {

      const db = new Database ( ':memory:' );

      const size1 = db.size;

      t.is ( size1, 0 );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      const size2 = db.size;

      t.is ( size2, 32768 );

      db.close ();

    });

  });

  describe ( 'backup', it => {

    it ( 'can backup a database', async t => {

      const db = new Database ( '' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );
      db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );

      await db.backup ( 'backup.db' );

      const db2 = new Database ( 'backup.db' );

      const rows1 = db.query ( `SELECT * FROM example LIMIT 1` );
      const rows2 = db2.query ( `SELECT * FROM example LIMIT 1` );

      t.deepEqual ( rows1, [{ id: 1, title: 'title1', description: 'description1' }] );
      t.deepEqual ( rows2, [{ id: 1, title: 'title1', description: 'description1' }] );

      db.close ();
      db2.close ();

      fs.unlinkSync ( 'backup.db' );

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

    it ( 'can re-open the connection automatically after closing', t => {

      const db = new Database ( ':memory:' );

      const result1 = db.query ( `SELECT 1 AS value` );

      t.deepEqual ( result1, [{ value: 1 }] );

      db.close ();

      const result2 = db.query ( `SELECT 2 AS value` );

      t.deepEqual ( result2, [{ value: 2 }] );

      db.close ();

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
        db.query ( `SELECT custom_sum(1, 2) as a, sum(1,2,3,4) as b` );
      }, { message: 'no such function: custom_sum' });

      const sum = ( ...numbers ) => numbers.reduce ( ( sum, number ) => sum + number, 0 );
      const dispose = db.function ( 'custom_sum', sum, { variadic: true } );
      const summed = db.query ( `SELECT custom_sum(1, 2) as a, custom_sum(1,2,3,4) as b` );

      t.deepEqual ( summed, [{ a: 3, b: 10 }] );

      dispose ();

      t.throws ( () => {
        db.query ( `SELECT custom_sum(1, 2) as a, custom_sum(1,2,3,4) as b` );
      }, { message: 'no such function: custom_sum' });

      db.close ();

    });

  });

  describe ( 'prepare', it => {

    it ( 'can prepare a query taking an array of values to execute later', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      const insert1 = db.prepare ( `INSERT INTO example VALUES( ?, ?, ? )` );
      const insert2 = db.prepare ( `INSERT INTO example VALUES( :id, :title, :description )` );

      insert1 ([ 1, 'title1', 'description1' ]);
      insert1 ([ 2, 'title2', 'description2' ]);

      insert2 ({ id: 3, title: 'title3', description: 'description3' });
      insert2 ({ id: 4, title: 'title4', description: 'description4' });

      const rows = db.query ( `SELECT * FROM example` );

      t.deepEqual ( rows[0], { id: 1, title: 'title1', description: 'description1' } );
      t.deepEqual ( rows[1], { id: 2, title: 'title2', description: 'description2' } );
      t.deepEqual ( rows[2], { id: 3, title: 'title3', description: 'description3' } );
      t.deepEqual ( rows[3], { id: 4, title: 'title4', description: 'description4' } );

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
      db.query ( `INSERT INTO example VALUES( @id, @title, @description )`, { id: 2, title: 'title2', description: 'description2' } );
      db.query ( `INSERT INTO example VALUES( $id, $title, $description )`, { id: 3, title: 'title3', description: 'description3' } );

      const rows = db.query ( `SELECT * FROM example` );

      t.deepEqual ( rows[0], { id: 1, title: 'title1', description: 'description1' } );
      t.deepEqual ( rows[1], { id: 2, title: 'title2', description: 'description2' } );
      t.deepEqual ( rows[2], { id: 3, title: 'title3', description: 'description3' } );

      db.close ();

    });

  });

  describe ( 'sql', it => {

    it.skip ( 'can interpolate a bigint', t => {

      const db = new Database ( ':memory:' );

      const rowsSmall = db.sql`SELECT ${123n} AS value`;

      t.deepEqual ( rowsSmall, [{ value: 123 }] );

      const rowsBig = db.sql`SELECT ${1152735103331642317n} AS value`;

      t.deepEqual ( rowsBig, [{ value: 1152735103331642317n }] );

      db.close ();

    });

    it ( 'can interpolate a null', t => {

      const db = new Database ( ':memory:' );

      const rows = db.sql`SELECT ${null} AS value`;

      t.deepEqual ( rows, [{ value: null }] );

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

      const data = new Uint8Array ([ 72, 101, 108, 108, 111, 44,  32,  87, 111, 114, 108, 100,  33 ]);

      const rows = db.sql`SELECT ${data.buffer} AS value`;

      t.deepEqual ( rows, [{ value: data.buffer }] );

      db.close ();

    });

    it ( 'can interpolate a Uint8Array', t => {

      const db = new Database ( ':memory:' );

      const data = new Uint8Array ([ 72, 101, 108, 108, 111, 44,  32,  87, 111, 114, 108, 100,  33 ]);

      const rows = db.sql`SELECT ${data} AS value`;

      t.deepEqual ( rows, [{ value: Buffer.from ( data ) }] ); //TODO: Avoid using Buffers

      db.close ();

    });

    it ( 'throws when interpolating a boolean', t => {

      const db = new Database ( ':memory:' );

      t.throws ( () => {
        db.sql`SELECT ${true} as value`;
      });

      t.throws ( () => {
        db.sql`SELECT ${false} as value`;
      });

      db.close ();

    });

    it ( 'throws when interpolating a date', t => {

      const db = new Database ( ':memory:' );

      t.throws ( () => {
        db.sql`SELECT ${true} as value`;
      });

      db.close ();

    });

    it ( 'throws when interpolating a plain object', t => {

      const db = new Database ( ':memory:' );

      t.throws ( () => {
        db.sql`SELECT ${{}} as value`;
      });

      db.close ();

    });

    it ( 'throws when interpolating a symbol', t => {

      const db = new Database ( ':memory:' );

      t.throws ( () => {
        db.sql`SELECT ${Symbol ()} as value`;
      });

      db.close ();

    });

    it ( 'throws when interpolating an array', t => {

      const db = new Database ( ':memory:' );

      t.throws ( () => {
        db.sql`SELECT ${[]} as value`;
      });

      db.close ();

    });

  });

  describe ( 'transaction', it => {

    it ( 'supports empty transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.false ( db.transacting );

      db.transaction ( () => {
        t.true ( db.transacting );
      });

      t.false ( db.transacting );

      const rows = db.query ( `SELECT * FROM example` );

      t.deepEqual ( rows, [] );

      db.close ();

    });

    it ( 'supports successful transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.false ( db.transacting );

      db.transaction ( () => {
        t.true ( db.transacting );
        db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
        db.query ( `INSERT INTO example VALUES( 2, 'title2', 'description2' )` );
        db.query ( `INSERT INTO example VALUES( 3, 'title3', 'description3' )` );
        t.true ( db.transacting );
      });

      t.false ( db.transacting );

      const rows = db.query ( `SELECT * FROM example` );

      const expected = [
        { id: 1, title: 'title1', description: 'description1' },
        { id: 2, title: 'title2', description: 'description2' },
        { id: 3, title: 'title3', description: 'description3' }
      ];

      t.deepEqual ( rows, expected );

      db.close ();

    });

    it ( 'supports failing transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.false ( db.transacting );

      t.throws ( () => {
        db.transaction ( () => {
          t.true ( db.transacting );
          db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
          db.query ( `INSERT INTO example VALUES( 2, 'title2', 'description2' )` );
          db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
          t.true ( db.transacting );
        });
      });

      t.false ( db.transacting );

      const rows = db.query ( `SELECT * FROM example` );

      t.deepEqual ( rows, [] );

      db.close ();

    });

    it ( 'supports empty nested transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.false ( db.transacting );

      db.transaction ( () => {
        t.true ( db.transacting );
        db.transaction ( () => {
          t.true ( db.transacting );
        });
        t.true ( db.transacting );
      });

      t.false ( db.transacting );

      const rows = db.query ( `SELECT * FROM example` );

      t.deepEqual ( rows, [] );

      db.close ();

    });

    it ( 'supports successful nested transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.false ( db.transacting );

      db.transaction ( () => {
        t.true ( db.transacting );
        db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
        db.transaction ( () => {
          t.true ( db.transacting );
          db.query ( `INSERT INTO example VALUES( 2, 'title2', 'description2' )` );
          t.true ( db.transacting );
        });
        db.query ( `INSERT INTO example VALUES( 3, 'title3', 'description3' )` );
        t.true ( db.transacting );
      });

      t.false ( db.transacting );

      const rows = db.query ( `SELECT * FROM example` );

      const expected = [
        { id: 1, title: 'title1', description: 'description1' },
        { id: 2, title: 'title2', description: 'description2' },
        { id: 3, title: 'title3', description: 'description3' }
      ];

      t.deepEqual ( rows, expected );

      db.close ();

    });

    it ( 'supports failing nested transactions', t => {

      const db = new Database ( ':memory:' );

      db.query ( `CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )` );

      t.false ( db.transacting );

      t.throws ( () => {
        db.transaction ( () => {
          t.true ( db.transacting );
          db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
          db.transaction ( () => {
            t.true ( db.transacting );
            db.query ( `INSERT INTO example VALUES( 1, 'title1', 'description1' )` );
            t.true ( db.transacting );
          });
          db.query ( `INSERT INTO example VALUES( 3, 'title3', 'description3' )` );
          t.true ( db.transacting );
        });
      });

      t.false ( db.transacting );

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

      const size1 = db.size;

      db.query ( `DELETE FROM example WHERE id=${1}` );

      const size2 = db.size;

      db.vacuum ();

      const size3 = db.size;

      db.vacuum ();

      const size4 = db.size;

      t.is ( size1, size2 );
      t.true ( size3 < size2 );
      t.is ( size3, size4 );

      db.close ();

    });

  });

  describe ( 'todo', it => {

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
