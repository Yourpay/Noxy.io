import * as Promise from "bluebird";
import * as Module from "../../modules/Module";

Module({name: "c", version: "1.0.0", module_dependencies: {x: "1.0.0", g: "1.0.0"}, node_dependencies: {}}, promise => {
  
  return Promise.resolve("C resolved!");
  
});