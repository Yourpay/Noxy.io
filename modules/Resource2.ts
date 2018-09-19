import * as _ from "lodash";
import {tEnum, tEnumValue} from "../interfaces/iAuxiliary";
import {cResource, cTable, iResource, iResourceFn, iResourceService} from "../interfaces/iResource2";

const resources = {};

const Service: iResourceFn = function Default<T extends tEnum<T>>(type: tEnumValue<T>, constructor: cResource<tEnumValue<T>>): cResource<tEnumValue<T>> {
  return constructor;
};

const Resource: cResource<any> = class Resource<T> implements iResource<T> {
  
  public static table: cTable<any>;
  
  constructor() {
  
  }
  
};

const Table: cTable<any> = class Table<T> implements cTable<T> {

};

const exported: iResourceService = _.assign(
  Service,
  {
    Constructor: Resource,
    Table:       Table,
    list:        resources
    
  }
);
export = exported;
