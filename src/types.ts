
/* MAIN */

type Callback = () => void;

type Options = {
  bin?: string,
  args?: string[],
  readonly?: boolean,
  timeout?: number,
  wal?: boolean
};

type Process = import ( 'node:child_process' ).ChildProcessWithoutNullStreams;

/* EXPORT */

export type {Callback, Options, Process};
