
/* MAIN */

const castError = ( exception: unknown ): Error => {

  if ( isError ( exception ) ) return exception;

  if ( isString ( exception ) ) return new Error ( exception );

  return new Error ( 'Unknown error' );

};

const isBoolean = ( value: unknown ): value is boolean => {

  return typeof value === 'boolean';

};

const isDate = ( value: unknown ): value is Date => {

  return value instanceof Date;

};

const isError = ( value: unknown ): value is Error => {

  return value instanceof Error;

};

const isFinite = ( value: unknown ): value is number => {

  return Number.isFinite ( value );

};

const isNil = ( value: unknown ): value is null | undefined => {

  return value === null || value === undefined;

};

const isNull = ( value: unknown ): value is null => {

  return value === null;

};

const isNumber = ( value: unknown ): value is number => {

  return typeof value === 'number';

};

const isString = ( value: unknown ): value is string => {

  return typeof value === 'string';

};

const isUint8Array = ( value: unknown ): value is Uint8Array => {

  return value instanceof Uint8Array;

};

/* EXPORT */

export {castError, isBoolean, isDate, isError, isFinite, isNil, isNull, isNumber, isString, isUint8Array};
