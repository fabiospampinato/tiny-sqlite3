
/* IMPORT */

import {describe} from 'fava';
import fs from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import Database from '../dist/index.js';

/* MAIN */

describe ( 'tiny-sqlite3', it => {

  it ( 'can create an in-disk database', async t => {

    const db = new Database ( 'test.db' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const rows = await db.sql`SELECT * FROM example LIMIT 1`;

    t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

    t.true ( fs.existsSync ( 'test.db' ) );
    t.true ( fs.existsSync ( db.name ) );

    t.true ( db.open );
    t.false ( db.memory );
    t.false ( db.readonly );

    db.close ();

    t.false ( db.open );

    fs.rmSync ( 'test.db' );

  });

  it ( 'can create an in-memory database', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const rows = await db.sql`SELECT * FROM example LIMIT 1`;

    t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

    t.true ( fs.existsSync ( db.name ) );

    t.true ( db.open );
    t.true ( db.memory );
    t.false ( db.readonly );

    db.close ();

    t.false ( db.open );

  });

  it ( 'can create a database that uses the same underlying files as another', async t => {

    const db1 = new Database ( ':memory:' );
    const db2 = new Database ( db1 );

    t.is ( db1.name, db2.name );

    db1.close ();
    db2.close ();

  });

  it ( 'can create multiple different in-memory databases', async t => {

    const db1 = new Database ( ':memory:' );
    const db2 = new Database ( ':memory:' );

    t.not ( db1.name, db2.name );

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

  it ( 'can interpolate a uint8array', async t => {

    const db = new Database ( ':memory:' );

    const data = new Uint8Array ([ 72, 101, 108, 108, 111, 44,  32,  87, 111, 114, 108, 100,  33 ]);

    const rows = await db.sql`SELECT ${data} AS value`;

    t.deepEqual ( rows, [{ value: 'Hello, World!' }] );

    db.close ();

  });

  it ( 'can interpolate a uint8calmpedarray', async t => {

    const db = new Database ( ':memory:' );

    const data = new Uint8ClampedArray ([ 72, 101, 108, 108, 111, 44,  32,  87, 111, 114, 108, 100,  33 ]);

    const rows = await db.sql`SELECT ${data} AS value`;

    t.deepEqual ( rows, [{ value: 'Hello, World!' }] );

    db.close ();

  });

  it ( 'can interpolate a arraybuffer', async t => {

    const db = new Database ( ':memory:' );

    const buffer = new Uint8Array ([ 72, 101, 108, 108, 111, 44,  32,  87, 111, 114, 108, 100,  33 ]).buffer;

    const rows = await db.sql`SELECT ${buffer} AS value`;

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

    const db = new Database ( ':memory:' );
    const rodb = new Database ( db, { readonly: true } );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const rows = await rodb.sql`SELECT * FROM example LIMIT 1`;

    t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

    t.false ( db.readonly );
    t.true ( rodb.readonly );

    await t.throwsAsync ( () => {
      return rodb.sql`INSERT INTO example VALUES( ${2}, ${'title2'}, ${'description2'} )`;
    }, { message: 'SQLITE_ERROR: Runtime error near line 12: attempt to write a readonly database (8)\n' } );

    db.close ();
    rodb.close ();

  });

  it ( 'can serialize/deserialize the whole database', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    const serialized = await db.serialize ();
    const deserialized = new Database ( serialized );

    const rows = await deserialized.sql`SELECT * FROM example LIMIT 1`;

    t.deepEqual ( rows, [{ id: 1, title: 'title1', description: 'description1' }] );

    t.true ( deserialized.memory, true );
    t.true ( fs.existsSync ( deserialized.name ) );

    db.close ();
    deserialized.close ();

    t.false ( fs.existsSync ( deserialized.name ) );

  });

  it ( 'can use the "wal" journal mode', async t => {

    const db = new Database ( ':memory:', { wal: true } );

    const rows = await db.sql`PRAGMA journal_mode`;

    t.deepEqual ( rows, [{ journal_mode: 'wal' }] );

    db.close ();

  });

  it ( 'defaults to the "delete" journal mode', async t => {

    const db = new Database ( ':memory:' );

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

      await delay ( 100 );

      t.false ( db.open );

    }

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
    }, { message: 'SQLITE_ERROR: incompatible "bigint" value' } );

    db.close ();

  });

  it ( 'throws when interpolating a plain object', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${{}} )`;
    }, { message: 'SQLITE_ERROR: incompatible "object" value' } );

    db.close ();

  });

  it ( 'throws when interpolating a symbol', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${Symbol ()} )`;
    }, { message: 'SQLITE_ERROR: incompatible "symbol" value' } );

    db.close ();

  });

  it ( 'throws when interpolating an array', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${[]} )`;
    }, { message: 'SQLITE_ERROR: incompatible "object" value' } );

    db.close ();

  });

  it ( 'throws when interpolating Infinity', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${Infinity} )`;
    }, { message: 'SQLITE_ERROR: incompatible "number" value' } );

    db.close ();

  });

  it ( 'throws when interpolating NaN', async t => {

    const db = new Database ( ':memory:' );

    await t.throwsAsync ( () => {
      return db.sql`INSERT INTO example VALUES( ${NaN} )`;
    }, { message: 'SQLITE_ERROR: incompatible "number" value' } );

    db.close ();

  });

  it ( 'throws when nested transactions are used', async t => { //TODO: Add support for them instead, it should be easy

    const db = new Database ( ':memory:' );

    await db.transaction ( () => {
      t.throwsAsync ( () => {
        return db.transaction ( () => {} );
      }, { message: 'SQLITE_ERROR: nested transactions are not supported' } );
    });

    db.close ();

  });

  it ( 'unlinks the in-memory database after close', async t => {

    const db = new Database ( ':memory:' );

    await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;
    await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;

    t.true ( fs.existsSync ( db.name ) );

    db.close ();

    t.false ( fs.existsSync ( db.name ) );

  });

  it ( 'unlinks the in-memory database after sqlite3 exits', async t => {

    const db = new Database ( ':memory:', { args: ['-bail'] } );

    try {

      await db.sql`SELECT * FROM missing`;

    } catch {

      await delay ( 100 );

      t.false ( db.open );
      t.false ( fs.existsSync ( db.name ) );

    }

  });

});
