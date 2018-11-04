import * as Promise from "bluebird";
import * as Module from "../../modules/Module";

Module({name: "g", version: "1.0.0", module_dependencies: {j: "1.0.0", k: "1.0.0"}, node_dependencies: {}}, promise => {
  
  return Promise.resolve("G resolved!");
  
});