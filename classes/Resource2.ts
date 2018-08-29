import {iConstructor, iResource, iResourceType, iTable} from "../interfaces/iResource";

function Default<T, R extends Resource>(type: Foo<T>, constructor: R): R {
  this.test = type;
  return constructor;
}

type Foo<T> = T extends keyof {[key: string]: string} ? T : never;

class Table implements iTable {

}

class Resource implements iConstructor {

}

const module: iResource = _.assign(
  {},
  Default,
  {
    Table:       Table,
    Constructor: Resource,
    CONSTANTS:   {
      TYPES: iResourceType
    }
  }
);

export = module;

enum YPAPI {
  "MERCHANT" = "merchant"
}

Default<iResourceType, Resource>(iResourceType.ROLE, Resource);
