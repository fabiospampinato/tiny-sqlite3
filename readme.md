# Tiny SQLite3

A Node cross-platform client for SQLite3, based on WASM.

This library is just a thin wrapper around [`node-deno-sqlite`](https://github.com/fabiospampinato/node-deno-sqlite/tree/node).

## Install

```sh
npm install --save tiny-sqlite3
```

## Usage

```ts
import Database from 'tiny-sqlite3';

// Create an in-memory database

const mem = new Database ( ':memory:' );

// Create a permament on-disk database

const db = new Database ( 'foo.db' );

// Create a temporary on-disk database, which is automatically deleted when the database is closed

const temp = new Database ( '' );

// Create a database with custom options

const custom = new Database ( 'bar.db', {
  page: 16_384, // Custom page size, in bytes
  size: 1_000_000, // Maximum allowed size of the database, in bytes
  readonly: true, // Opening the database in read-only mode
  wal: true // Using the WAL journaling mode, rather than the default one
});

// Read the various properties attached to the database instance

db.path // => full path to the main file containing the data for the database, or ":memory:" if it's an in-memory database
db.memory // => whether it's in an in-memory database or not
db.readonly // => whether the database is opened in read-only mode or not
db.temporary // => whether it's a temporary database or not, temporary databases are automatically deleted from disk on close

// Perform an SQL query, without requesting any output

db.execute ( 'CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )' );

// Perform an SQL query, requesting resulting rows as objects

const limit = 1;
const rows = db.query ( 'SELECT * FROM example LIMIT 1' ); // No interpolation
const rows = db.query ( 'SELECT * FROM example LIMIT ?', [limit] ); // Array interpolation
const rows = db.query ( 'SELECT * FROM example LIMIT :limit', {limit} ); // Object interpolation
const rows = db.sql`SELECT * FROM example LIMIT ${limit}`; // Inline interpolation

// Register a custom function

const sum = ( ...numbers ) => numbers.reduce ( ( sum, number ) => sum + number, 0 );
const dispose = db.function ( 'sum', sum );
const summed = db.query ( `SELECT sum(1, 2) as a, sum(1,2,3,4) as b` ); // => [{ a: 3, b: 10 }]

dispose (); // Unregister the function

// Serialize the database to a Uint8Array, and create a new temporary database from that Uint8Array

const serialized = db.serialize ();
const deserialized = new Database ( serialized );

// Get the current size of the database

const size = db.size ();

// Vacuum the database, shrinking its size by reducing fragmentation caused by deleted pages

db.vacuum ();

// Start a transaction, which is executed immediately and rolled back automatically if the function passed to the "transaction" method throws at any point

db.transaction ( () => {
  db.query ( 'INSERT INTO example VALUES( ?, ?, ? )', [1, 'title1', 'description1'] );
  db.query ( 'INSERT INTO example VALUES( ?, ?, ? )', [2, 'title2', 'description2'] );
  db.query ( 'INSERT INTO example VALUES( ?, ?, ? )', [1, 'title1', 'description1'] ); // This will cause the transaction to be rolled back
});

// Close the connection to the database, from this point onwards no further queries can be executed

db.close ();
```

## License

MIT © Fabio Spampinato
