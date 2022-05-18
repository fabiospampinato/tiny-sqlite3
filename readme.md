# Tiny SQLite3

A tiny cross-platform client for SQLite3, with the official precompiled binaries as the only third-party dependencies.

## Install

```sh
npm install --save tiny-sqlite3
```

## Usage

```ts
import Database from 'tiny-sqlite3';

// Create a temporary in-memory database

const mem = new Database ( ':memory:' );

// Create a permament in-disk database

const db = new Database ( 'foo.db' );

// Read the various properties attached to the database instance

db.name // => full path to the main file containing the data for the database
db.memory // => whether it's in an in-memory database or not, in-memory databases are actually just stored in temporary files on disk
db.open // => whether there's a connection to the database or not
db.readonly // => whether the database is opened in read-only mode or not
db.transacting // => whether a transaction is currently being executed or not

// Backup the whole database to a specific location, safer than manually coping files

await db.backup ( 'foo.db.bak' );

// Serialize the database to a Uint8Array, and create a new in-memory database from that Uint8Array

const serialized = await db.serialize ();
const deserialized = new Database ( serialized );

// Perform an SQL query, interpolated values are escaped automatically

const limit = 1;
const rows = await db.sql`SELECT * FROM example LIMIT ${limit}`;

// Interpolate a raw, unescaped, string in a SQL query

const rows2 = await db.sql`SELECT * FROM ${db.raw ( 'example' )} LIMIT ${limit}`;

// Start a transaction, which is executed immediately and rolled back automatically if the function passed to the "transaction" method throws at any point

await db.sql`CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )`;

const success = db.transaction ( () => {
  await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`;
  await db.sql`INSERT INTO example VALUES( ${2}, ${'title2'}, ${'description2'} )`;
  await db.sql`INSERT INTO example VALUES( ${1}, ${'title1'}, ${'description1'} )`; // This will cause the transaction to be rolled back
});

console.log ( success ); // => true|false

// Close the connection to the database, from this point onwards no further queries can be executed

db.close ();
```

## Thanks

- [`sqlite-tag-spawned`](https://github.com/WebReflection/sqlite-tag-spawned): for providing a sort of reference implementation, this project is very much derivative work of that.
- [`@WebReflection`](https://github.com/WebReflection): for also providing the idea of directly spawning the official prebuild binaries.

## License

MIT © Fabio Spampinato
