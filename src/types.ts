
/* MAIN */

type Callback = {
  (): void
};

type Dict<T> = {
  [key: string]: T
};

type Disposer = {
  (): void
};

type DatabaseOptions = {
  bin?: string, // Path to "better-sqlite3.node"
  page?: number, // Bytes
  readonly?: boolean,
  size?: number, // Bytes
  timeout?: number, // Milliseconds
  wal?: boolean
};

type FunctionOptions = {
  deterministic?: boolean,
  direct?: boolean,
  variadic?: boolean
};

type In = null | undefined | string | number | bigint | Uint8Array;

type Out = null | string | number | bigint | Uint8Array;

/* EXPORT */

export type {Callback, Dict, Disposer, DatabaseOptions, FunctionOptions, In, Out};
