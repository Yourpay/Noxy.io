import * as _ from "lodash";
import {iModuleFn, iModuleService} from "../interfaces/iModule";

const Service: iModuleFn = function Default(): any {
  
  return null;
  
};

const exported: iModuleService = _.assign(
  Service,
  {
  }
);

export = exported;
