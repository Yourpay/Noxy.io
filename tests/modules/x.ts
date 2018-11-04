import * as Promise from "bluebird";
import * as Module from "../../modules/Module";

Module({name: "x", version: "1.0.0", module_dependencies: {g: "1.0.0"}, node_dependencies: {}}, promise => {
  
  return Promise.resolve("X resolved!");
  
});