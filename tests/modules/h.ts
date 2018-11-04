import * as Promise from "bluebird";
import * as Module from "../../modules/Module";

Module({name: "h", version: "1.0.0", module_dependencies: {}, node_dependencies: {}}, promise => {
  
  return Promise.resolve("H resolved!");
  
});