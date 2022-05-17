
/* MAIN */

class SqliteError extends Error {

  /* CONSTRUCTOR */

  constructor ( message: string ) {

    super ( `SQLITE_ERROR: ${message}` );

  }

}

/* EXPORT */

export default SqliteError;
