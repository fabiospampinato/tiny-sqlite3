
/* IMPORT */

import {describe} from 'fava';
import fs from 'node:fs';
import os from 'node:os';
import process from 'node:process';
import {setTimeout as delay} from 'node:timers/promises';
import U8 from 'uint8-encoding';
import Database from '../dist/index.js';

/* MAIN */

describe ( 'tiny-sqlite3', it => {

  it ( 'can be closed multiple times without throwing', t => {

    const db = new Database ( ':memory:' );

    db.close ();
    db.close ();
    db.close ();

    t.pass ();

  });

  it ( 'can re-open the connection automatically after closing', async t => {

    const db = new Database ( ':memory:' );

    const result1 = await db.sql`SELECT 1 AS value`;

    t.deepEqual ( result1, [{ value: 1 }] );

    db.close ();

    const result2 = await db.sql`SELECT 2 AS value`;

    t.deepEqual ( result2, [{ value: 2 }] );

    db.close ();

    t.pass ();

  });

  it ( 'can re-open the connection automatically after killing', async t => {

    const db = new Database ( ':memory:' );

    const result1 = await db.sql`SELECT 1 AS value`;

    t.deepEqual ( result1, [{ value: 1 }] );

    process.kill ( db.pid (), 'SIGKILL' );
    process.kill ( db.pid (), 'SIGKILL' );
    process.kill ( db.pid (), 'SIGKILL' );

    await delay ( 100 );

    const result2 = await db.sql`SELECT 2 AS value`;

    t.deepEqual ( result2, [{ value: 2 }] );

    db.close ();

    t.pass ();

  });

  it ( 'can create an in-disk database', async t => {

    const db = new Database ( 'test.db' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const rows = await db.sql`SELECT * FROM example LIMIT 1`;

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

  it ( 'can create an in-memory database', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const rows = await db.sql`SELECT * FROM example LIMIT 1`;

    t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

    t.is ( db.path, ':memory:' );

    t.true ( db.memory );
    t.false ( db.readonly );
    t.false ( db.temporary );

    db.close ();

  });

  it ( 'can create an in-temporary database', async t => {

    const db = new Database ( '' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const rows = await db.sql`SELECT * FROM example LIMIT 1`;

    t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

    t.true ( fs.existsSync ( db.path ) );
    t.true ( db.path.startsWith ( os.tmpdir () ) );

    t.false ( db.memory );
    t.false ( db.readonly );
    t.true ( db.temporary );

    db.close ();

    t.false ( fs.existsSync ( db.path ) );

  });

  it ( 'can create a database that uses the same underlying files as another', async t => {

    const db1 = new Database ( '' );
    const db2 = new Database ( db1.path );

    await db1.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db1.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const rows1 = await db1.sql`SELECT * FROM example LIMIT 1`;
    const rows2 = await db2.sql`SELECT * FROM example LIMIT 1`;

    t.is ( db1.path, db2.path );

    t.deepEqual ( rows1, [{ id: 1, title: 'title1', description: 'description1' }] );
    t.deepEqual ( rows2, [{ id: 1, title: 'title1', description: 'description1' }] );

    db1.close ();
    db2.close ();

  });

  it ( 'can create multiple different in-memory databases', async t => {

    const db1 = new Database ( ':memory:' );
    const db2 = new Database ( ':memory:' );

    await db1.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db1.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    await db2.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db2.sql`INSERT INTO example VALUES( ${2}, ${'title2'}, ${'description2'} )`;

    const rows1 = await db1.sql`SELECT * FROM example LIMIT 1`;
    const rows2 = await db2.sql`SELECT * FROM example LIMIT 1`;

    t.deepEqual ( rows1, [{ id: 1, title: 'title1', description: 'description1' }] );
    t.deepEqual ( rows2, [{ id: 2, title: 'title2', description: 'description2' }] );

    db1.close ();
    db2.close ();

  });

  it ( 'can backup the whole database', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    await db.backup ( 'backup.db' );

    const backup = new Database ( 'backup.db' );

    const rows = await backup.sql`SELECT * FROM example LIMIT 1`;

    t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

    db.close ();
    backup.close ();

    fs.unlinkSync ( 'backup.db' );

  });

  it ( 'can return some infos', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const info = await db.info ();

    t.is ( typeof info['database page size'], 'string' );

    db.close ();

  });

  it ( 'can return some statistics', async t => {

    const db = new Database ( ':memory:' );

    const stats = await db.stats ();

    t.is ( typeof stats['Memory Used'], 'string' );

    db.close ();

  });

  it ( 'can interpolate a boolean', async t => {

    const db = new Database ( ':memory:' );

    const rowsTrue = await db.sql`SELECT ${true} AS value`;

    t.deepEqual ( rowsTrue, [{ value: 1 }] );

    const rowsFalse = await db.sql`SELECT ${false} AS value`;

    t.deepEqual ( rowsFalse, [{ value: 0 }] );

    db.close ();

  });

  it ( 'can interpolate a date', async t => {

    const db = new Database ( ':memory:' );

    const date = new Date ();

    const rows = await db.sql`SELECT ${date} AS value`;

    t.deepEqual ( rows, [{ value: date.toISOString () }] );

    db.close ();

  });

  it ( 'can interpolate a null', async t => {

    const db = new Database ( ':memory:' );

    const rows = await db.sql`SELECT ${null} AS value`;

    t.deepEqual ( rows, [{ value: null }] );

    db.close ();

  });

  it ( 'can interpolate a number', async t => {

    const db = new Database ( ':memory:' );

    const rows = await db.sql`SELECT ${123} AS value`;

    t.deepEqual ( rows, [{ value: 123 }] );

    db.close ();

  });

  it ( 'can interpolate a raw string', async t => {

    const db = new Database ( ':memory:' );

    const rows = await db.sql`${db.raw ( 'SELECT' )} 123 AS value`;

    t.deepEqual ( rows, [{ value: 123 }] );

    db.close ();

  });

  it ( 'can interpolate a string', async t => {

    const db = new Database ( ':memory:' );

    const rows = await db.sql`SELECT ${'foo'} AS value`;

    t.deepEqual ( rows, [{ value: 'foo' }] );

    db.close ();

  });

  it ( 'can interpolate a string with automatic escaping', async t => {

    const db = new Database ( ':memory:' );

    const rows = await db.sql`SELECT ${"f''o'o"} AS value`;

    t.deepEqual ( rows, [{ value: "f''o'o" }] );

    db.close ();

  });

  it ( 'can interpolate a Uint8Array', async t => {

    const db = new Database ( ':memory:' );

    const data = new Uint8Array ([ 72, 101, 108, 108, 111, 44,  32,  87, 111, 114, 108, 100,  33 ]);

    const rows = await db.sql`SELECT ${data} AS value`;

    t.deepEqual ( rows, [{ value: 'Hello, World!' }] );

    db.close ();

  });

  it ( 'can interpolate an undefined', async t => {

    const db = new Database ( ':memory:' );

    const rows = await db.sql`SELECT ${undefined} AS value`;

    t.deepEqual ( rows, [{ value: null }] );

    db.close ();

  });

  it ( 'can open a database in readonly mode', async t => {

    const db = new Database ( '' );
    const rodb = new Database ( db.path, { readonly: true } );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const rows = await rodb.sql`SELECT * FROM example LIMIT 1`;

    t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

    t.false ( db.readonly );
    t.true ( rodb.readonly );

    await t.throwsAsync ( () => {
      return rodb.sql`INSERT INTO example VALUES( ${2}, ${'title2'}, ${'description2'} )`;
    }, { message: 'Runtime error near line 7: attempt to write a readonly database (8)\n' } );

    db.close ();
    rodb.close ();

  });

  it ( 'can set the size of a page', async t => {

    const db1 = new Database ( ':memory:' );

    const count1 = await db1.sql`PRAGMA page_size`;

    t.deepEqual ( count1, [{ page_size: 4096 }] );

    const db2 = new Database ( ':memory:', { page: 8192 } );

    const count2 = await db2.sql`PRAGMA page_size`;

    t.deepEqual ( count2, [{ page_size: 8192 }] );

    db1.close ();
    db2.close ();

  });

  it ( 'can limit the size of a database', async t => {

    const db1 = new Database ( ':memory:' );

    const count1 = await db1.sql`PRAGMA max_page_count`;

    t.deepEqual ( count1, [{ max_page_count: 1073741823 }] );

    const db2 = new Database ( ':memory:', { size: 4096000 } );

    const count2 = await db2.sql`PRAGMA max_page_count`;

    t.deepEqual ( count2, [{ max_page_count: 1000 }] );

    db1.close ();
    db2.close ();

  });

  it ( 'can retrieve the size of the database', async t => {

    const db = new Database ( ':memory:' );

    const size1 = await db.size ();

    t.is ( size1, 0 );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const size2 = await db.size ();

    t.is ( size2, 8192 );

    db.close ();

  });

  it ( 'can dump the contents of a database', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const sql = await db.dump ();

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

  it ( 'can recover the contents of a database', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const sql = await db.recover ();

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

  it ( 'can query manually for a raw Uint8Array result', async t => {

    const db = new Database ( ':memory:' );

    const result = await db.query ( 'SELECT 1 AS value', 'buffer' );

    t.deepEqual ( result, U8.encode ( '[{"value":1}]\n' ) );

    db.close ();

  });

  it ( 'can query manually for a raw json result', async t => {

    const db = new Database ( ':memory:' );

    const result = await db.query ( 'SELECT 1 AS value', 'json' );

    t.is ( result, '[{"value":1}]\n' );

    db.close ();

  });

  it ( 'can query manually for a parsed json result', async t => {

    const db = new Database ( ':memory:' );

    const result = await db.query ( 'SELECT 1 AS value' );

    t.deepEqual ( result, [{ value: 1 }] );

    db.close ();

  });

  it ( 'can query manually for no result', async t => {

    const db = new Database ( ':memory:' );

    const result = await db.query ( 'SELECT 1 AS value', 'null' );

    t.is ( result, undefined );

    db.close ();

  });

  it ( 'can serialize/deserialize the whole database', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const serialized = await db.serialize ();
    const deserialized = new Database ( serialized );

    const rows = await deserialized.sql`SELECT * FROM example LIMIT 1`;

    t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

    t.true ( deserialized.temporary );
    t.true ( fs.existsSync ( deserialized.path ) );

    db.close ();
    deserialized.close ();

    t.false ( fs.existsSync ( deserialized.path ) );

  });

  it ( 'can shrink a database by vacuuming freed pages', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'.repeat ( 10_000 )} )`;

    const size1 = await db.size ();

    await db.sql`DELETE FROM example WHERE id=${1}`;

    const size2 = await db.size ();

    await db.vacuum ();

    const size3 = await db.size ();

    t.is ( size1, size2 );
    t.true ( size3 < size2 );

    db.close ();

  });

  it ( 'can use the "wal" journal mode', async t => {

    const db = new Database ( '', { wal: true } );

    const rows = await db.sql`PRAGMA journal_mode`;

    t.deepEqual ( rows, [{ journal_mode: 'wal' }] );

    db.close ();

  });

  it ( 'defaults to the "delete" journal mode', async t => {

    const db = new Database ( '' );

    const rows = await db.sql`PRAGMA journal_mode`;

    t.deepEqual ( rows, [{ journal_mode: 'delete' }] );

    db.close ();

  });

  it ( 'supports arbitrary binary path', async t => {

    const db1 = new Database ( ':memory:' );
    const db2 = new Database ( ':memory:', { bin: 'sqlite3' } );

    const rows1 = await db1.sql`SELECT sqlite_version()`;
    const rows2 = await db2.sql`SELECT sqlite_version()`;

    t.notDeepEqual ( rows1, rows2 );

    db1.close ();
    db2.close ();

  });

  it ( 'supports arbitrary binary arguments', async t => {

    const db = new Database ( ':memory:', { args: ['-bail'] } );

    try {

      await db.sql`SELECT * FROM missing`;

    } catch {

      t.pass ();

    }

  });

  it ( 'supports closing the process automatically after a ttl', async t => {

    const db = new Database ( ':memory:', { ttl: 250 } );

    const pid1 = db.pid ();

    await db.sql`SELECT 1 AS value`;

    const pid2 = db.pid ();

    await delay ( 200 );

    await db.sql`SELECT 1 AS value`;

    const pid3 = db.pid ();

    await delay ( 200 );

    const pid4 = db.pid ();

    await delay ( 200 );

    const pid5 = db.pid ();

    t.is ( pid1, undefined );
    t.true ( pid2 > 0 );
    t.is ( pid2, pid3 );
    t.is ( pid3, pid4 );
    t.is ( pid5, undefined );

    db.close ();

  });

  it ( 'supports empty batches', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;

    t.false ( db.batching );

    const result = await db.batch ( () => {
      t.true ( db.batching );
    });

    t.false ( db.batching );

    const rows = await db.sql`SELECT * FROM example`;

    t.is ( result, undefined );
    t.deepEqual ( rows, [] );

    db.close ();

  });

  it ( 'supports successful batches', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;

    t.false ( db.batching );

    const result = await db.batch ( () => {
      t.true ( db.batching );
      db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;
      db.sql`INSERT INTO example VALUES( ${2}, ${'title2'}, ${'description2'} )`;
      db.sql`INSERT INTO example VALUES( ${3}, ${'title3'}, ${'description3'} )`;
      t.true ( db.batching );
    });

    t.false ( db.batching );

    const rows = await db.sql`SELECT * FROM example`;

    const expected = [
      { id: 1, title: 'title1', description: 'description1' },
      { id: 2, title: 'title2', description: 'description2' },
      { id: 3, title: 'title3', description: 'description3' }
    ];

    t.is ( result, undefined );
    t.deepEqual ( rows, expected );

    db.close ();

  });

  it ( 'supports failing batches', async t => {

    const db = new Database ( ':memory:', { bin: 'sqlite3' } );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;

    t.false ( db.batching );

    await t.throwsAsync ( async () => {
      await db.batch ( () => {
        t.true ( db.batching );
        db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;
        db.sql`INSERT INTO example VALUES( ${2}, ${'title2'}, ${'description2'} )`;
        db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;
        db.sql`INSERT INTO example VALUES( ${3}, ${'title3'}, ${'description3'} )`;
        t.true ( db.batching );
      });
    }, { message: 'Error: near line 11: stepping, UNIQUE constraint failed: example.id (19)\n' } );

    t.false ( db.batching );

    const rows = await db.sql`SELECT * FROM example`;

    const expected = [
      { id: 1, title: 'title1', description: 'description1' },
      { id: 2, title: 'title2', description: 'description2' },
      { id: 3, title: 'title3', description: 'description3' }
    ];

    t.deepEqual ( rows, expected );

    db.close ();

  });

  it ( 'supports empty transactions', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;

    t.false ( db.transacting );

    const result = await db.transaction ( async () => {
      t.true ( db.transacting );
    });

    t.false ( db.transacting );

    const rows = await db.sql`SELECT * FROM example`;

    t.is ( result, true );
    t.deepEqual ( rows, [] );

    db.close ();

  });

  it ( 'supports successful transactions', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;

    t.false ( db.transacting );

    const result = await db.transaction ( async () => {
      t.true ( db.transacting );
      await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;
      await db.sql`INSERT INTO example VALUES( ${2}, ${'title2'}, ${'description2'} )`;
      await db.sql`INSERT INTO example VALUES( ${3}, ${'title3'}, ${'description3'} )`;
      t.true ( db.transacting );
    });

    t.false ( db.transacting );

    const rows = await db.sql`SELECT * FROM example`;

    const expected = [
      { id: 1, title: 'title1', description: 'description1' },
      { id: 2, title: 'title2', description: 'description2' },
      { id: 3, title: 'title3', description: 'description3' }
    ];

    t.is ( result, true );
    t.deepEqual ( rows, expected );

    db.close ();

  });

  it ( 'supports failing transactions', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;

    t.false ( db.transacting );

    const result = await db.transaction ( async () => {
      t.true ( db.transacting );
      await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;
      await db.sql`INSERT INTO example VALUES( ${2}, ${'title2'}, ${'description2'} )`;
      await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;
      t.true ( db.transacting );
    });

    t.false ( db.transacting );

    const rows = await db.sql`SELECT * FROM example`;

    t.is ( result, false );
    t.deepEqual ( rows, [] );

    db.close ();

  });

  it ( 'throws when interpolating a bigint', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${123n} )`;
    }, { message: 'Unsupported "bigint" value' } );

    db.close ();

  });

  it ( 'throws when interpolating a plain object', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${{}} )`;
    }, { message: 'Unsupported "object" value' } );

    db.close ();

  });

  it ( 'throws when interpolating a symbol', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${Symbol ()} )`;
    }, { message: 'Unsupported "symbol" value' } );

    db.close ();

  });

  it ( 'throws when interpolating an array', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${[]} )`;
    }, { message: 'Unsupported "object" value' } );

    db.close ();

  });

  it ( 'throws when interpolating Infinity', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${Infinity} )`;
    }, { message: 'Unsupported "number" value' } );

    db.close ();

  });

  it ( 'throws when interpolating NaN', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${NaN} )`;
    }, { message: 'Unsupported "number" value' } );

    db.close ();

  });

  it ( 'throws when nested batches are used', async t => { //TODO: Add support for them instead, it should be easy

    const db = new Database ( ':memory:' );

    await db.batch ( async () => {
      await t.throwsAsync ( () => {
        return db.batch ( () => {} );
      }, { message: 'Nested batches are not supported' } );
    });

    db.close ();

  });

  it ( 'throws when nested transactions are used', async t => { //TODO: Add support for them instead, it should be easy

    const db = new Database ( ':memory:' );

    await db.transaction ( async () => {
      await t.throwsAsync ( () => {
        return db.transaction ( () => {} );
      }, { message: 'Nested transactions are not supported' } );
    });

    db.close ();

  });

  it ( 'unlinks the in-temporary database after close', async t => {

    const db = new Database ( '' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    t.true ( fs.existsSync ( db.path ) );

    db.close ();

    t.false ( fs.existsSync ( db.path ) );

  });

  it ( 'unlinks the in-temporary database after sqlite3 exits', async t => {

    const db = new Database ( '', { args: ['-bail'] } );

    try {

      await db.sql`SELECT * FROM missing`;

    } catch {

      await delay ( 100 );

      t.false ( fs.existsSync ( db.path ) );

    }

  });

});
