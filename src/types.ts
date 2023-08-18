
/* MAIN */

type Callback = () => void;

type Info = Record<string, string>;

type Options = {
  bin?: string,
  args?: string[],
  page?: number, // Bytes
  size?: number, // Bytes
  readonly?: boolean,
  timeout?: number, // Milliseconds
  wal?: boolean
};

type Process = import ( 'node:child_process' ).ChildProcessWithoutNullStreams;

type Stats = Record<string, string>;

/* EXPORT */

export type {Callback, Info, Options, Process, Stats};
