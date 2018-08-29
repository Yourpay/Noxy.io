import {iConstructor, iResource, iResourceType, iTable} from "../interfaces/iResource";

function Default<T extends Object, R extends Resource>(type: (iResourceType | T), constructor: R): R {
  this.test = type;
  return constructor;
}

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
    CONSTANTS: {
      TYPES: iResourceType
    }
  }
);

// export = module;

enum YPAPI {
  "MERCHANT" = "merchant"
}

export default module(
  "",
  Resource
);