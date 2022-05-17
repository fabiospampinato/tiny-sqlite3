
/* MAIN */

class Raw {

  /* VARIABLES */

  private value: string;

  /* CONSTRUCTOR */

  constructor ( value: string ) {

    this.value = value;

  }

  /* API */

  get (): string {

    return this.value;

  }

}

/* EXPORT */

export default Raw;
