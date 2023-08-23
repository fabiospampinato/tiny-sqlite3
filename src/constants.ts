
/* MAIN */

const MEMORY_DATABASE = ':memory:';
const TEMPORARY_DATABASE = '';

const PAGE_SIZE = ( 2 ** 14 ); // 16KB
const PAGES_COUNT = ( 2 ** 30 ) - 1;

/* EXPORT */

export {MEMORY_DATABASE, TEMPORARY_DATABASE, PAGE_SIZE, PAGES_COUNT};
