# Tiny SQLite3

A tiny convenience Node client for SQLite3, based on [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

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
  bin: '/path/to/better-sqlite3.node', // Custom path to the native module, for bundling purposes
  page: 16_384, // Custom page size, in bytes
  size: 1_000_000, // Maximum allowed size of the database, in bytes
  readonly: true, // Opening the database in read-only mode
  timeout: 60_000, // Maximum allowed time for a query to run, in milliseconds
  wal: true // Using the WAL journaling mode, rather than the default one
});

// Read the various properties attached to the database instance

db.path // => full path to the main file containing the data for the database, or ":memory:" if it's an in-memory database
db.memory // => whether it's in an in-memory database or not
db.readonly // => whether the database is opened in read-only mode or not
db.temporary // => whether it's a temporary database or not, temporary databases are automatically deleted from disk on close

db.changes // => number of rows modified, inserted or deleted by the most recent query
db.lastInsertRowId // => the id of the row that was last inserted
db.size // => the size of the database, in bytes
db.totalChanges // => the total number of rows modified, inserted or deleted since the database was last opened
db.transacting // => whether you are currently inside a transaction block or not

// Perform a SQL query, without requesting any output

db.execute ( 'CREATE TABLE example ( id INTEGER PRIMARY KEY, title TEXT, description TEXT )' );

// Perform a SQL query, requesting resulting rows as objects

const limit = 1;
const rows = db.query ( 'SELECT * FROM example LIMIT 1' ); // No interpolation
const rows = db.query ( 'SELECT * FROM example LIMIT ?', [limit] ); // Array interpolation
const rows = db.query ( 'SELECT * FROM example LIMIT :limit', {limit} ); // Object interpolation
const rows = db.sql`SELECT * FROM example LIMIT ${limit}`; // Inline interpolation

// Perform a type-aware SQL query, where both input parameters and output rows are typed

type Row = { id: number, title: string, description: string };
type ParametersArray = [number, string, string];
type ParametersObject = Row;

const rows = db.query<Row> ( 'SELECT * FROM example LIMIT 1' ); // No interpolation
const rows = db.query<Row, ParametersArray> ( 'SELECT * FROM example LIMIT ?', [limit] ); // Array interpolation
const rows = db.query<Row, ParametersObject> ( 'SELECT * FROM example LIMIT :limit', {limit} ); // Object interpolation

// Perform a query using a precompiled query, which can be cleaner. Internally regular queries use cached precompiled queries also, for performance

const getRows = db.prepare<Row, ParametersArray> ( 'SELECT * FROM example LIMIT ?' );
const rows = getRows ([ 1 ]);

// Register a custom function

const sum = ( ...numbers ) => numbers.reduce ( ( sum, number ) => sum + number, 0 );
const dispose = db.function ( 'sum', sum );
const summed = db.query ( `SELECT sum(1, 2) as a, sum(1,2,3,4) as b` ); // => [{ a: 3, b: 10 }]

dispose (); // Unregister the function

// Backup a database to a provided path

await db.backup ( 'backup.db' );

// Serialize the database to a Uint8Array, and create a new temporary database from that Uint8Array

const serialized = db.serialize ();
const deserialized = new Database ( serialized );

// Vacuum the database, potentially shrinking its size by reducing fragmentation caused by deleted pages

db.vacuum ();

// Start a transaction, which is executed immediately and rolled back automatically if the function passed to the "transaction" method throws at any point

db.transaction ( () => {
  db.query ( 'INSERT INTO example VALUES( ?, ?, ? )', [1, 'title1', 'description1'] );
  db.query ( 'INSERT INTO example VALUES( ?, ?, ? )', [2, 'title2', 'description2'] );
  db.query ( 'INSERT INTO example VALUES( ?, ?, ? )', [1, 'title1', 'description1'] ); // This will cause the transaction to be rolled back automatically
});

// Manually close the connection to the database
// The connection is automatically re-opened if you execute another query, for convenience

db.close ();
```

## License

MIT © Fabio Spampinato
