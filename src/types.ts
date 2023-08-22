
/* MAIN */

type Disposer = {
  (): void
};

type DatabaseOptions = {
  page?: number, // Bytes
  readonly?: boolean,
  size?: number, // Bytes
  wal?: boolean
};

type FunctionOptions = {
  deterministic?: boolean
};

type Meta = {
  autoCommit: boolean,
  changes: number,
  lastInsertRowId: number,
  totalChanges: number
};

/* EXPORT */

export type {Disposer, DatabaseOptions, FunctionOptions, Meta};
